import { effect, signal } from "alien-signals";
import { Curtains, Plane } from "curtainsjs";
import "../mixin";
import {
	defaultVCurtainsParams,
	type Signal,
	type VCurtainsParams,
} from "../params";
import {
	curtainsEvents,
	flattenDefaultParams,
	vDeepReadOnly,
	vEmit,
	vProvide,
	type SubscriptionKey,
} from "../utils";
/**
 * @element v-curtains
 * @tag v-curtains
 * @prop {VCurtainsParams} params
 * event "after-resize" | "context-lost" | "context-restored" | "error" | "success" | "render" | "scroll"
 * @fires after-resize
 * @fires context-lost
 * @fires context-restored
 * @fires error
 * @fires success
 * @fires render
 * @fires scroll
 */
export class VCurtains extends HTMLElement {
	static {
		customElements.define("v-curtains", VCurtains);
	}

	#params!: Signal<VCurtainsParams>;
	#effect!: () => void;
	container: HTMLDivElement;
	curtains!: Curtains;

	get params() {
		return this.#params();
	}

	set params(params: VCurtainsParams) {
		this.#params?.(params);
	}

	get gl() {
		return this.curtains.gl;
	}

	createPlane(
		createFn: (
			curtains: Curtains,
			container: HTMLDivElement,
			params: VCurtainsParams
		) => Plane
	) {
		return createFn(this.curtains, this.container, this.params);
	}

	static get observedAttributes() {
		return ["params"];
	}

	attributeChangedCallback(attrName: string, oldVal: any, newVal: any) {
		if (oldVal === newVal) return; // 遍历所有attributes，除了params以外都设置到container上
		if (attrName === "params") {
			if (typeof newVal === "string") {
				// to json
				this.#params?.(JSON.parse(newVal));
			} else {
				this.#params?.(newVal);
			}
		} else if (attrName.startsWith("container-")) {
			this.container.setAttribute(attrName.replace("container-", ""), newVal);
		}
	}

	constructor() {
		super();
		this.container = document.createElement("div");
	}

	connectedCallback() {
		// 处理所有attributes到container的映射（相当于Vue的v-bind="$attrs"）
		for (let i = 0; i < this.attributes.length; i++) {
			const attr = this.attributes[i];
			if (attr.name.startsWith("container-")) {
				this.container.setAttribute(
					attr.name.replace("container-", ""),
					attr.value
				);
			}
		}

		// this.appendChild(this.container)
		// 插入到第一;
		this.insertAdjacentElement("afterbegin", this.container);

		// 设置默认params值
		if (!this.hasAttribute("params")) {
			this.setAttribute("params", JSON.stringify({}));
		}

		const initialParams = flattenDefaultParams(
			JSON.parse(this.getAttribute("params") || "{}"),
			defaultVCurtainsParams
		) as VCurtainsParams;

		this.#params = signal<VCurtainsParams>(initialParams);
		const paramsWithContainer = {
			...this.params,
			pixelRatio: Math.min(1.5, window.devicePixelRatio),
			container: this.container,
		};
		this.curtains = new Curtains(paramsWithContainer);
		vProvide("curtainsEvents", curtainsEvents);
		vProvide("curtains", vDeepReadOnly(this.curtains));
		// 创建响应式更新effect
		this.#effect = effect(() => {
			const params = this.params;
			for (const key in params) {
				if (this.curtains.hasOwnProperty(key)) {
					// @ts-ignore
					this.curtains[key] = params[key];
				}
			}
		});

		// 绑定事件监听器并向外派发事件
		Object.keys(curtainsEvents.subscriptions).forEach((subscription) => {
			this.curtains[subscription as SubscriptionKey](() => {
				// 派发自定义事件给外部使用（转换为kebab-case命名）
				const eventName =
					curtainsEvents.kebabCase[subscription as SubscriptionKey];
				vEmit(this, eventName, this.curtains);

				// 执行内部订阅回调
				curtainsEvents.subscriptions[subscription as SubscriptionKey].forEach(
					(element) => {
						element?.callback(this.curtains);
					}
				);
			});
		});
	}

	disconnectedCallback() {
		this.#effect();
		this.curtains.dispose();
	}
}
