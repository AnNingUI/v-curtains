import type { AllParams } from "./params";

export const generateUUID = () => {
	return "_" + Math.random().toString(36).substr(2, 9);
};

export const flattenDefaultParams = (
	params: AllParams,
	defaultParams: AllParams
) => {
	const flattenedParams: AllParams = {};

	(Object.keys(params) as Array<keyof AllParams>).forEach((param) => {
		const value = params[param];
		const type = typeof value;
		if (value && type) {
			flattenedParams[param] = defaultParams[param];
		} else {
			flattenedParams[param] = value;
		}
	});

	return flattenedParams;
};

export type SubscriptionKey =
	| "onAfterResize"
	| "onContextLost"
	| "onContextRestored"
	| "onError"
	| "onSuccess"
	| "onRender"
	| "onScroll";
export type Subscription = {
	id: string;
	event: SubscriptionKey;
	callback: (...args: any[]) => void;
};
type Subscriptions = {
	onAfterResize: {
		id: string;
		event: "onAfterResize";
		callback: (...args: any[]) => void;
	}[];
	onContextLost: {
		id: string;
		event: "onContextLost";
		callback: (...args: any[]) => void;
	}[];
	onContextRestored: {
		id: string;
		event: "onContextRestored";
		callback: (...args: any[]) => void;
	}[];
	onError: {
		id: string;
		event: "onError";
		callback: (...args: any[]) => void;
	}[];
	onSuccess: {
		id: string;
		event: "onSuccess";
		callback: (...args: any[]) => void;
	}[];
	onRender: {
		id: string;
		event: "onRender";
		callback: (...args: any[]) => void;
	}[];
	onScroll: {
		id: string;
		event: "onScroll";
		callback: (...args: any[]) => void;
	}[];
};

export const curtainsEvents = {
	subscriptions: {
		onAfterResize: [],
		onContextLost: [],
		onContextRestored: [],
		onError: [],
		onSuccess: [],
		onRender: [],
		onScroll: [],
	} as Subscriptions,

	kebabCase: {
		onAfterResize: "after-resize",
		onContextLost: "context-lost",
		onContextRestored: "context-restored",
		onError: "error",
		onSuccess: "success",
		onRender: "render",
		onScroll: "scroll",
	} as const,

	isValidEvent(event: SubscriptionKey) {
		return !!Object.keys(this.subscriptions).find((e) => event === e);
	},

	addSubscription(subscription: Subscription) {
		if (!this.isValidEvent(subscription.event)) return;
		const subscriptionArray = this.subscriptions[
			subscription.event
		] as Subscription[];
		// is it already in our subscription event array?
		const existingSubscription = subscriptionArray.find(
			(el) => el.id === subscription.id
		);
		// if not we'll add it
		if (!existingSubscription) {
			subscriptionArray.push(subscription);
		}
	},

	removeSubscription(subscription: { id: string; event: keyof Subscriptions }) {
		if (!this.isValidEvent(subscription.event)) return;
		const subscriptionArray = this.subscriptions[
			subscription.event
		] as Subscription[];
		// remove from our subscription event array
		(this.subscriptions[subscription.event] as Subscription[]) =
			subscriptionArray.filter((el) => el.id !== subscription.id);
	},
};

export type CurtainsEvents = typeof curtainsEvents;

export type KebabCase = typeof curtainsEvents.kebabCase;

// context.ts
class VContext {
	private static instance: VContext;
	private contexts: Map<string, any> = new Map();

	private constructor() {}

	static getInstance(): VContext {
		if (!VContext.instance) {
			VContext.instance = new VContext();
		}
		return VContext.instance;
	}

	provide(key: string, value: any) {
		this.contexts.set(key, value);
	}

	inject<T>(key: string): T | undefined {
		return this.contexts.get(key);
	}
}

const vContext = VContext.getInstance();

export function vProvide<T>(key: string, value: T) {
	vContext.provide(key, value);
}
export function vInject<T>(key: string, defaultValue: T | null): T | undefined;
export function vInject<T>(key: string): T | undefined;
export function vInject<T>(
	key: string,
	defaultValue?: T | null
): T | undefined {
	const value = vContext.inject<T>(key);
	return value !== undefined ? value : defaultValue ?? undefined;
}

export type DeepReadonly<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};
type Primitive = null | undefined | string | number | boolean | symbol | bigint;

function isPrimitive(v: any): v is Primitive {
	return v === null || (typeof v !== "object" && typeof v !== "function");
}

function isPlainObject(obj: any): obj is Record<string | symbol, any> {
	if (!obj || typeof obj !== "object") return false;
	const proto = Object.getPrototypeOf(obj);
	return proto === Object.prototype || proto === null;
}

function isBuiltinLike(obj: any) {
	// 不递归以下类型（可扩展）：Date, RegExp, Map, Set, WeakMap, WeakSet, Function, DOM Nodes...
	if (obj instanceof Date) return true;
	if (obj instanceof RegExp) return true;
	if (obj instanceof Map) return true;
	if (obj instanceof Set) return true;
	if (typeof Node !== "undefined" && obj instanceof Node) return true; // DOM node
	if (typeof obj === "function") return true;
	return false;
}

/**
 * 深度变为只读（运行时 Object.freeze）。
 * - 能处理循环引用（使用 WeakMap 记录已处理对象）
 * - 只递归数组与 plain object，其他内建类型会被原样返回（可按需扩展）
 */
export function vDeepReadOnly<T>(obj: T): Readonly<T> {
	const seen = new WeakMap<object, object>();

	function inner<T>(o: T): any {
		if (isPrimitive(o)) return o;

		// 如果不是对象（比如函数）直接返回原始值
		if (typeof o !== "object" || o === null) return o;

		// builtin-like 类型保守处理（不递归）
		if (isBuiltinLike(o)) {
			// 对 Date/RegExp 等直接返回原对象（如果需要也可 return Object.freeze(o)）
			return o;
		}

		// 已处理过 -> 返回之前的引用（处理循环引用）
		if (seen.has(o as object)) {
			return seen.get(o as object);
		}

		let result: any;
		if (Array.isArray(o)) {
			result = [];
			// 先放入 seen，以避免数组内部循环引用导致再次进入
			seen.set(o as object, result);
			for (let i = 0; i < (o as any).length; i++) {
				result[i] = inner((o as any)[i]);
			}
		} else if (isPlainObject(o)) {
			result = {};
			seen.set(o as object, result);
			// own string/symbol keys
			const keys = Object.keys(o) as Array<string>;
			for (const k of keys) {
				result[k] = inner((o as any)[k]);
			}
			// also handle symbol keys
			const symKeys = Object.getOwnPropertySymbols(o) as symbol[];
			for (const s of symKeys) {
				result[s as any] = inner((o as any)[s]);
			}
		} else {
			// 不是 plain object（比如 class 实例），保守处理：尽量遍历 own props but keep prototype intact
			result = Object.create(Object.getPrototypeOf(o));
			seen.set(o as object, result);
			const keys = Reflect.ownKeys(o) as Array<string | symbol>;
			for (const k of keys) {
				// skip non-enumerable? 我们复制所有 own properties
				const desc = Object.getOwnPropertyDescriptor(o as any, k);
				if (!desc) continue;
				// 如果是访问器属性，直接复制 descriptor（避免读 getter 造成副作用）
				if ("get" in desc || "set" in desc) {
					try {
						Object.defineProperty(result, k, desc);
					} catch {
						// 忽略无法定义的属性
					}
				} else {
					// 普通数据属性，递归其值
					(result as any)[k] = inner((o as any)[k]);
				}
			}
		}

		// 最后 freeze 并返回
		try {
			Object.freeze(result);
		} catch (e) {
			// 某些环境下 freeze 可能会失败（宿主对象），忽略错误
		}
		return result;
	}

	return inner(obj) as Readonly<T>;
}

export class Options<A> {
	readonly _URI!: "Options";
	readonly _A!: A;
	readonly _tag?: "Some" | "None";

	constructor(public readonly value: A | null) {}

	static ofNullable<A>(value?: A | null): Options<A> {
		return value === undefined || value === null || value instanceof None
			? None.of()
			: new Some(value);
	}

	public isNone() {
		return this.value === null && this instanceof None && this._tag === "None";
	}

	public isSome() {
		return this.value !== null && this instanceof Some && this._tag === "Some";
	}

	public orElse<B>(value: B): Options<A | B> {
		return this.isNone() ? new Some(value) : this;
	}

	public get() {
		if (this.value === null) {
			throw new Error("Option.get called on None");
		}
		return this.value;
	}

	public getOrElse<B>(defaultValue: B): A | B {
		return this.isSome() ? (this.value as A) : defaultValue;
	}

	public match<B>({
		some,
		none,
	}: {
		some: (value: NonNullable<A>) => B;
		none: () => B;
	}): B {
		if (this.isSome()) {
			return some?.(this.value!);
		} else {
			return none?.();
		}
	}

	public flatMap<B>(f: (a: NonNullable<A>) => Options<B>) {
		if (this.isSome()) {
			return f(this.value!);
		} else {
			return None.of() as Options<B>;
		}
	}
}

export class Some<A> extends Options<A> {
	readonly _URI!: "Options";
	readonly _A!: A;
	readonly _tag = "Some";

	constructor(public readonly value: A) {
		super(value);
	}
}

export class None extends Options<never> {
	readonly _URI!: "Options";
	readonly _A!: never;
	readonly _tag = "None";
	readonly value = null;

	private static INSTANCE: None;

	private constructor() {
		super(null);
	}

	public static of(): None {
		if (!this.INSTANCE) {
			this.INSTANCE = new None();
			return this.INSTANCE;
		} else {
			return this.INSTANCE as None;
		}
	}
}
