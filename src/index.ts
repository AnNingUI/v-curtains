import type { VCurtains } from "./components/v-curtains";
import type { VFXAAPass } from "./components/v-fxaa-pass";
import type { VPingPongPlaneParams } from "./params";

export * from "./hook";
export * from "./mixin";
export { vDeepReadOnly, vInject, vProvide } from "./utils";
export type { CurtainsEvents, DeepReadonly } from "./utils";
// web component global types

declare global {
	interface HTMLElementTagNameMap {
		"v-curtains": VCurtains;
		"v-fxaa-pass": VFXAAPass;
		"v-ping-pong-plane": VPingPongPlaneParams;
	}
}
