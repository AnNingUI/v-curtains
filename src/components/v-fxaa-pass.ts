import { effect, signal } from "alien-signals";
import { FXAAPass } from "curtainsjs";
import { useCurtains } from "../hook";
import {
	IsVBaseQueue,
	SetupKey,
	VBaseQueueMixin,
	type WebComponentExt,
} from "../mixin";
import {
	defaultVFXAAPassParams,
	type Signal,
	type VFXAAPassParams,
} from "../params";
import { flattenDefaultParams, vEmit } from "../utils";

/**
 * @element v-fxaa-pass
 * @tag v-fxaa-pass
 * @prop {VCurtainsParams} params
 * event "before-create" | "loading" | "error" | "ready" | "after-resize" | "render" | "after-render" | "before-remove"
 * @fires before-create
 * @fires loading
 * @fires error
 * @fires ready
 * @fires after-resize
 * @fires render
 * @fires before-remove
 */
@VBaseQueueMixin
export class VFXAAPass extends HTMLElement {
	static {
		customElements.define("v-fxaa-pass", VFXAAPass);
	}

	#params!: Signal<VFXAAPassParams>;
	#effect!: () => void;
	fxaaPass!: FXAAPass;

	static get observedAttributes() {
		return ["params"];
	}

	get params() {
		return this.#params();
	}

	set params(params: VFXAAPassParams) {
		this.#params?.(params);
	}

	attributeChangedCallback(attrName: string, oldVal: any, newVal: any) {
		if (oldVal === newVal) return; // 遍历所有attributes，除了params以外都设置到container上
		if (attrName === "params") {
			if (typeof newVal === "string") {
				// to json
				const parsedVal = JSON.parse(newVal) as VFXAAPassParams;
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
	}

	@IsVBaseQueue(SetupKey)
	onSetup() {
		// 设置默认params值
		if (!this.hasAttribute("params")) {
			this.setAttribute("params", JSON.stringify({}));
		}

		const initialParams = flattenDefaultParams(
			JSON.parse(this.getAttribute("params") || "{}"),
			defaultVFXAAPassParams
		) as VFXAAPassParams;

		this.#params = signal<VFXAAPassParams>(initialParams);
		useCurtains(this as unknown as WebComponentExt, (curtains) => {
			const emit = vEmit.bind(this, this);
			emit("before-create");
			this.fxaaPass = new FXAAPass(curtains, this.params);
			const fxaaPass = this.fxaaPass;
			this.fxaaPass
				.onError(() => emit("error", fxaaPass))
				.onLoading((texture) =>
					emit("loading", {
						fxaaPass,
						texture,
					})
				)
				.onReady(() => emit("ready", fxaaPass))
				.onAfterResize(() => emit("after-resize", fxaaPass))
				.onRender(() => emit("render", fxaaPass))
				.onAfterRender(() => emit("after-render", fxaaPass));
		});
	}

	connectedCallback() {
		this.#effect = effect(() => {
			const renderOrder = this.params.renderOrder; // 拿到最新的 renderOrder
			if (renderOrder && renderOrder != this.fxaaPass.renderOrder) {
				this.fxaaPass.setRenderOrder(renderOrder);
			}
		});
	}

	disconnectedCallback() {
		if (this.fxaaPass) {
			this.dispatchEvent(
				new CustomEvent("before-remove", {
					detail: {
						fxaaPass: this.fxaaPass,
					},
				})
			);
			this.fxaaPass.remove();
		}
		this.#effect();
	}
}
