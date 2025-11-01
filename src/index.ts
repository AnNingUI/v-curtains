import type { VCurtains } from "./components/v-curtains";

export { vDeepReadOnly, vInject, vProvide } from "./utils";
export type { CurtainsEvents, DeepReadonly } from "./utils";

// web component global types

declare global {
	interface HTMLElementTagNameMap {
		"v-curtains": VCurtains;
	}
}
