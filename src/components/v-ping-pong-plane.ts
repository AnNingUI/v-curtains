import { effect, signal } from "alien-signals";
import { PingPongPlane } from "curtainsjs";
import { useCurtains } from "../hook";
import {
	IsVBaseQueue,
	SetupKey,
	VBaseQueueMixin,
	type WebComponentExt,
} from "../mixin";
import {
	defaultVPingPongPlaneParams,
	type Signal,
	type VPingPongPlaneParams,
} from "../params";
import { flattenDefaultParams, vEmit } from "../utils";

@VBaseQueueMixin
export class VPinePongPlane extends HTMLElement {
	#params!: Signal<VPingPongPlaneParams>;
	#effect!: () => void;
	plane!: PingPongPlane;
	planeEl: HTMLDivElement;

	static get observedAttributes() {
		return ["params"];
	}

	get params() {
		return this.#params();
	}

	attributeChangedCallback(attrName: string, oldVal: any, newVal: any) {
		if (oldVal === newVal) return; // 遍历所有attributes，除了params以外都设置到container上
		if (attrName === "params") {
			if (typeof newVal === "string") {
				// to json
				const parsedVal = JSON.parse(newVal) as VPingPongPlaneParams;
				this.#params?.(parsedVal);
			} else {
				this.#params?.(newVal);
			}
		} else {
			this.setAttribute(attrName, newVal);
		}
	}

	constructor() {
		super();
		this.planeEl = document.createElement("div");
	}

	@IsVBaseQueue(SetupKey)
	onSetup() {
		if (!this.hasAttribute("params")) {
			this.setAttribute("params", JSON.stringify({}));
		}

		const initialParams = flattenDefaultParams(
			JSON.parse(this.getAttribute("params") || "{}"),
			defaultVPingPongPlaneParams
		) as VPingPongPlaneParams;

		this.#params = signal<VPingPongPlaneParams>(initialParams);
		this.#effect = effect(() => {
			const parsedVal = this.params; // get latest value
			(
				[
					"alwaysDraw",
					"cullFace",
					"drawCheckMargins",
					"visible",
					"watchScroll",
				] as const
			).forEach((key) => {
				if (
					parsedVal[key] !== undefined &&
					parsedVal[key] !== this.plane[key]
				) {
					(this.plane[key] as any) = parsedVal[key];
				}
			});
			if (
				parsedVal.depthTest !== undefined &&
				// @ts-ignore
				this.plane["depthTest"] !== parsedVal.depthTest
			) {
				this.plane.enableDepthTest(parsedVal.depthTest);
			}
			if (
				parsedVal.renderOrder !== undefined &&
				this.plane.renderOrder !== parsedVal.renderOrder
			) {
				this.plane.setRenderOrder(parsedVal.renderOrder);
			}
			if (
				parsedVal.target !== undefined &&
				this.plane.target !== parsedVal.target
			) {
				console.log("new RT!!!", parsedVal.target);
				this.plane.setRenderTarget(parsedVal.target);
			}
		});
		useCurtains(this as unknown as WebComponentExt, (curtains) => {
			vEmit(this, "before-create");
			this.plane = new PingPongPlane(curtains, this.planeEl, this.params);

			const emit = vEmit.bind(this, this);
			const plane = this.plane;
			this.plane
				.onError(() => emit("error", plane))
				.onLoading((texture) =>
					emit("loading", {
						plane,
						texture,
					})
				)
				.onReady(() => emit("ready", plane))
				.onAfterResize(() => emit("after-resize", plane))
				.onLeaveView(() => emit("leave-view", plane))
				.onReEnterView(() => emit("re-enter-view", plane))
				.onRender(() => emit("render", plane))
				.onAfterRender(() => emit("after-render", plane));
		});
	}

	disconnectedCallback() {
		this.#effect();
		if (this.plane) {
			vEmit(this, "before-destroy", this.plane);
			this.plane.remove();
		}
	}
}
