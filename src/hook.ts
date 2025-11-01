import type { Curtains } from "curtainsjs";
import type { WebComponentExt } from "./mixin";
import { Options, vInject } from "./utils";

let curtainsInstance: Curtains | null = null;

// 必须在 setup 生命周期中使用而不是 connectedCallback 或者 constructor
export function useCurtains(
	self: WebComponentExt,
	callback: (curtains: Curtains) => void = () => {}
) {
	let isMounted = false;
	const curtains = Options.ofNullable<Curtains>(vInject("curtains", null));

	const launchCallback = () => {
		if (curtainsInstance && isMounted) {
			callback(curtainsInstance);
		}
	};

	self.mountQueue.push(() => {
		isMounted = true;
		launchCallback();
	});

	if (curtains.isSome()) {
		launchCallback();
	} else {
		Object.defineProperty(curtains.value, "container", {
			set: async (container: Element) => {
				if (container) {
					curtainsInstance = curtains.value;
					launchCallback();
				}
			},
		});
	}
}
