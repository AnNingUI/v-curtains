export type Signal<T> = {
	(): T;
	(value: T): void;
};

export interface VCurtainsParams {
	alpha?: boolean;
	antialias?: boolean;
	permultipliedAlpha?: boolean;
	depth?: boolean;
	preserveDrawingBuffer?: boolean;
	failIfMajorPerformanceCaveat?: boolean;
	stencil?: boolean;
	autoRender?: boolean;
	autoResize?: boolean;
	pixelRatio?: number;
	renderingScale?: number;
	watchScroll?: boolean;
	production?: boolean;
}

export const defaultVCurtainsParams: VCurtainsParams = {
	alpha: true,
	antialias: true,
	permultipliedAlpha: false,
	depth: true,
	preserveDrawingBuffer: false,
	failIfMajorPerformanceCaveat: true,
	stencil: false,
	autoRender: true,
	autoResize: true,
	pixelRatio: 1,
	renderingScale: 1,
	watchScroll: true,
	production: process.env.NODE_ENV === "production",
};

export interface VFXAAPassParams {
	renderOrder?: number;
	depthTest?: boolean;
	clear?: boolean;
	texturesOptions?: any;

	// render target
	renderTarget?: any;
}

export const defaultVFXAAPassParams: VFXAAPassParams = {
	renderOrder: 0,
	depthTest: true,
	clear: true,
	texturesOptions: {},

	// render target
	renderTarget: null,
};

export interface VPingPongPlaneParams {
	sampler?: string;
	vertexShader?: string;
	vertexShaderID?: string;
	fragmentShader?: string;
	fragmentShaderID?: string;
	widthSegments?: number;
	heightSegments?: number;
	renderOrder?: number;
	transparent?: boolean;
	cullFace?: string;
	alwaysDraw?: boolean;
	visible?: boolean;
	drawCheckMargins?: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
	watchScroll?: boolean;
	texturesOptions?: object;
	crossOrigin?: string;
	fov?: number;
	uniforms?: object;
	target?: any;
	relativeTranslation?: any;
	rotation?: any;
	scale?: any;
	transformOrigin?: any;
}

export const defaultVPingPongPlaneParams: VPingPongPlaneParams = {
	sampler: "uPingPongTexture",
	vertexShader: undefined,
	vertexShaderID: undefined,
	fragmentShader: undefined,
	fragmentShaderID: undefined,
	widthSegments: 1,
	heightSegments: 1,
	renderOrder: 0,
	transparent: false,
	cullFace: "back",
	alwaysDraw: false,
	visible: true,
	drawCheckMargins: {
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	},
	watchScroll: true,
	texturesOptions: {},
	crossOrigin: "",
	fov: 50,
	uniforms: {},

	// render target
	target: null,

	// plane transformations
	relativeTranslation: null,
	rotation: null,
	scale: null,
	transformOrigin: null,
};

export interface VPlaneParams {
	vertexShader?: string;
	vertexShaderID?: string;
	fragmentShader?: string;
	fragmentShaderID?: string;
	widthSegments?: number;
	heightSegments?: number;
	renderOrder?: number;
	depthTest?: boolean;
	transparent?: boolean;
	cullFace?: string;
	alwaysDraw?: boolean;
	visible?: boolean;
	drawCheckMargins?: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
	watchScroll?: boolean;
	autoloadSources?: boolean;
	texturesOptions?: object;
	crossOrigin?: string;
	fov?: number;
	uniforms?: object;
	target?: any;
	relativeTranslation?: any;
	rotation?: any;
	scale?: any;
	transformOrigin?: any;
}

export const defaultVPlaneParams: VPlaneParams = {
	vertexShader: undefined,
	vertexShaderID: undefined,
	fragmentShader: undefined,
	fragmentShaderID: undefined,
	widthSegments: 1,
	heightSegments: 1,
	renderOrder: 0,
	depthTest: true,
	transparent: false,
	cullFace: "back",
	alwaysDraw: false,
	visible: true,
	drawCheckMargins: {
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	},
	watchScroll: true,
	autoloadSources: true,
	texturesOptions: {},
	crossOrigin: "",
	fov: 50,
	uniforms: {},
	// render target
	target: null,
	// plane transformations
	relativeTranslation: null,
	rotation: null,
	scale: null,
	transformOrigin: null,
};

export interface VRenderTargetParams {
	depth?: boolean;
	clear?: boolean;
	maxWidth?: number;
	maxHeight?: number;
	minWidth?: number;
	minHeight?: number;
	texturesOptions?: object;
}

export const defaultVRenderTargetParams: VRenderTargetParams = {
	depth: true,
	clear: true,
	maxWidth: undefined,
	maxHeight: undefined,
	minWidth: undefined,
	minHeight: undefined,
	texturesOptions: {},
};

export interface VShaderPassParams {
	vertexShader?: string;
	vertexShaderID?: string;
	fragmentShader?: string;
	fragmentShaderID?: string;
	renderOrder?: number;
	depthTest?: boolean;
	depth?: boolean;
	clear?: boolean;
	texturesOptions?: object;
	crossOrigin?: string;
	uniforms?: object;

	// render target
	renderTarget?: any;
}

export const defaultVShaderPassParams: VShaderPassParams = {
	vertexShader: undefined,
	vertexShaderID: undefined,
	fragmentShader: undefined,
	fragmentShaderID: undefined,
	renderOrder: 0,
	depthTest: true,
	depth: false,
	clear: true,
	texturesOptions: {},
	crossOrigin: "",
	uniforms: {},
	// render target
	renderTarget: null,
};

export type AllParams =
	| VCurtainsParams
	| VFXAAPassParams
	| VPingPongPlaneParams
	| VPlaneParams
	| VRenderTargetParams
	| VShaderPassParams;
