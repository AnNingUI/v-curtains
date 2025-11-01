export const MonutKey = Symbol("mount");
export const UnmountKey = Symbol("unmount");
export const SetupKey = Symbol("setup");

// ------------------------
// 简单并发调度器
// ------------------------
export class VTaskScheduler {
	private taskQueue: Array<() => Promise<any>> = [];
	private isProcessing: boolean = false;
	private maxConcurrent: number;
	private runningTasks: number = 0;

	constructor(maxConcurrent: number = 5) {
		this.maxConcurrent = Math.max(1, Math.floor(maxConcurrent));
	}

	addTask<T>(task: () => Promise<T> | T): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const wrapped = async () => {
				try {
					const r = await task();
					resolve(r as T);
				} catch (e) {
					reject(e);
				}
			};
			this.taskQueue.push(wrapped);
			this.processQueue();
		});
	}

	private async processQueue() {
		if (this.isProcessing) return;
		this.isProcessing = true;

		while (
			this.taskQueue.length > 0 &&
			this.runningTasks < this.maxConcurrent
		) {
			const task = this.taskQueue.shift()!;
			this.runningTasks++;
			task()
				.catch((err) => console.error("TaskScheduler task error:", err))
				.finally(() => {
					this.runningTasks--;
				});
		}

		this.isProcessing = false;
	}

	clear() {
		this.taskQueue = [];
	}

	getStatus() {
		return {
			pendingTasks: this.taskQueue.length,
			runningTasks: this.runningTasks,
			isProcessing: this.isProcessing,
		};
	}
}

export const globalTaskScheduler = new VTaskScheduler(3);

// ------------------------
// 类型定义
// ------------------------
type MaybePromiseFn = () => Promise<any> | any;

export type WebComponentExt = {
	mountQueue: MaybePromiseFn[];
	unmountQueue: MaybePromiseFn[];
	__taskScheduler?: VTaskScheduler;
	// internal flag used previously — not needed for auto-enqueue but kept if you extended
	__setupScheduled?: boolean;
};

// ------------------------
// 装饰器元数据类型 & 工具：
//  把每个被装饰的方法记录到原型上的 __vbase_queue_meta
//  每条元数据：{ key: methodName, kind: MonutKey|UnmountKey|SetupKey, order }
// ------------------------
type QueueMeta = { key: string; kind: symbol; order: number };

const META_KEY = "__vbase_queue_meta";

function pushMeta(target: any, meta: QueueMeta) {
	// 保证存在数组；使用原型对象存储元数据
	if (!Object.prototype.hasOwnProperty.call(target, META_KEY)) {
		Object.defineProperty(target, META_KEY, {
			value: [],
			enumerable: false,
			configurable: true,
			writable: true,
		});
	}
	(target as any)[META_KEY].push(meta);
}

// ------------------------
// Method Decorator：只注册元数据（不立即入队）
// 使用说明：@IsVBaseQueue(MonutKey) 在类上声明方法应在 mounted 时自动入队
//  -- 装饰器不改变方法的即时行为（你仍然可以手动调用方法）
// ------------------------
let __globalOrderCounter = 0;
export function IsVBaseQueue(
	prefix: typeof MonutKey | typeof UnmountKey | typeof SetupKey
) {
	return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
		// 保存元数据到原型（注意：装饰器运行时是类定义阶段，因此是在原型上写入元数据）
		pushMeta(target, {
			key: propertyKey,
			kind: prefix,
			order: ++__globalOrderCounter,
		});
		// 不改写 descriptor.value（保留原方法行为），return descriptor
		return descriptor;
	};
}

// ------------------------
// Class Decorator：VBaseQueueMixin
// - connectedCallback 时从原型链上收集元数据并为实例建立入队回调
// - 保证 Setup 方法在 mount 队首（多个 setup 按 order 执行）
// - 先按顺序等待执行所有 setup，然后并发执行剩余 mount 任务
// ------------------------
export function VBaseQueueMixin(constructor: Function) {
	// Ensure instance properties exist on prototype (so instances inherit)
	constructor.prototype.mountQueue = [];
	constructor.prototype.unmountQueue = [];

	const originalConnected = Reflect.get(
		constructor.prototype,
		"connectedCallback"
	) as (() => void | Promise<void>) | undefined;
	const originalDisconnected = Reflect.get(
		constructor.prototype,
		"disconnectedCallback"
	) as (() => void | Promise<void>) | undefined;

	// Helper: collect metadata from prototype chain (base -> derived order)
	function collectMeta(proto: any): QueueMeta[] {
		const metas: QueueMeta[] = [];
		const seen = new Set<any>();
		let p = proto;
		const chain: any[] = [];
		// collect prototypes up to Object.prototype
		while (p && p !== Object.prototype) {
			chain.unshift(p);
			p = Object.getPrototypeOf(p);
		}
		for (const pr of chain) {
			const arr: QueueMeta[] | undefined = pr[META_KEY];
			if (Array.isArray(arr)) {
				for (const m of arr) {
					// avoid duplicate meta objects (same method on multiple levels)
					const sig = `${m.key}@${m.kind.toString()}@${m.order}`;
					if (!seen.has(sig)) {
						seen.add(sig);
						metas.push(m);
					}
				}
			}
		}
		// sort by order to preserve definition order across classes
		metas.sort((a, b) => a.order - b.order);
		return metas;
	}

	constructor.prototype.connectedCallback = async function (
		this: HTMLElement & WebComponentExt
	) {
		// ensure queues exist on instance
		this.mountQueue = this.mountQueue || [];
		this.unmountQueue = this.unmountQueue || [];
		const scheduler = this.__taskScheduler ?? globalTaskScheduler;

		// 1) 从原型链读取所有被标记的方法元数据，并将对应的回调添加到实例队列
		const metas = collectMeta(Object.getPrototypeOf(this));
		// metas 按定义顺序排列（父类 -> 子类），我们需要：
		// - 把所有 Setup 放到队首（按元数据顺序）
		// - 把 mount 放到队尾（按元数据顺序）
		// - 把 unmount 放到 unmountQueue（按元数据顺序）
		// 注意：为了避免重复加入（例如多个 connected 被调用），我们只在 mountQueue/unmountQueue为空时自动填充
		// 这允许外部在构造或其他代码中预填充队列而不会被覆盖。
		if (this.mountQueue.length === 0 && this.unmountQueue.length === 0) {
			// We will push setups first, then mounts. Use temporary arrays to preserve order.
			const setupArr: QueueMeta[] = [];
			const mountArr: QueueMeta[] = [];
			const unmountArr: QueueMeta[] = [];

			for (const m of metas) {
				if (m.kind === SetupKey) setupArr.push(m);
				else if (m.kind === MonutKey) mountArr.push(m);
				else if (m.kind === UnmountKey) unmountArr.push(m);
			}

			// create callbacks for setups (unshift to mountQueue so they are first)
			for (let i = setupArr.length - 1; i >= 0; i--) {
				const key = setupArr[i].key;
				// callback that calls the method on this (no args by default)
				const cb = () => (this as any)[key]();
				// tag for detection in earlier implementations if needed
				(cb as any).__isSetup = true;
				(this.mountQueue = this.mountQueue || []).unshift(cb);
			}

			// create mount callbacks
			for (const m of mountArr) {
				const cb = () => (this as any)[m.key]();
				(this.mountQueue = this.mountQueue || []).push(cb);
			}

			// create unmount callbacks
			for (const m of unmountArr) {
				const cb = () => (this as any)[m.key]();
				(this.unmountQueue = this.unmountQueue || []).push(cb);
			}
		}

		// 2) 执行：先顺序执行所有 setup（它们在队首并被标记 __isSetup）
		while (
			this.mountQueue.length > 0 &&
			(this.mountQueue[0] as any).__isSetup === true
		) {
			const setupCb = this.mountQueue.shift()!;
			await scheduler.addTask(() => Promise.resolve().then(() => setupCb()));
		}

		// 3) 并发执行剩余的 mount 任务（包括 setup 内 push 的）
		if (this.mountQueue.length > 0) {
			const remaining = this.mountQueue.splice(0);
			const promises = remaining.map((cb) =>
				scheduler.addTask(() => Promise.resolve().then(() => cb()))
			);
			await Promise.allSettled(promises);
		}

		// 4) 调用原始 connectedCallback（如果有）
		if (originalConnected) {
			await originalConnected.call(this);
		}
	};

	// disconnectedCallback: 并发执行 unmountQueue
	constructor.prototype.disconnectedCallback = async function (
		this: HTMLElement & WebComponentExt
	) {
		const scheduler = this.__taskScheduler ?? globalTaskScheduler;

		this.unmountQueue = this.unmountQueue || [];
		if (this.unmountQueue.length > 0) {
			const remaining = this.unmountQueue.splice(0);
			const promises = remaining.map((cb) =>
				scheduler.addTask(() => Promise.resolve().then(() => cb()))
			);
			await Promise.allSettled(promises);
		}

		if (originalDisconnected) {
			await originalDisconnected.call(this);
		}
	};
}

// // ------------------------
// // 示例：测试自动入队行为
// // ------------------------
// @VBaseQueueMixin
// class DemoElem extends HTMLElement {
// 	mountQueue!: MaybePromiseFn[];
// 	unmountQueue!: MaybePromiseFn[];

// 	constructor() {
// 		super();
// 		this.attachShadow({ mode: "open" });
// 		this.shadowRoot!.innerHTML = `<div>DemoElem</div>`;
// 	}

// 	connectedCallback() {
// 		console.log("DemoElem: original connectedCallback called");
// 	}

// 	disconnectedCallback() {
// 		console.log("DemoElem: original disconnectedCallback called");
// 	}

// 	@IsVBaseQueue(SetupKey)
// 	async setup() {
// 		console.log("[setup] start", Date.now());
// 		// 在 setup 内添加 mount 与 unmount 任务，验证会被包含
// 		this.addPostSetupMount();
// 		this.addPostSetupUnmount();
// 		await new Promise((r) => setTimeout(r, 300));
// 		console.log("[setup] done", Date.now());
// 	}

// 	@IsVBaseQueue(MonutKey)
// 	async loadHeavyResource() {
// 		console.log("[loadHeavyResource] start", Date.now());
// 		await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000));
// 		console.log("[loadHeavyResource] done", Date.now());
// 	}

// 	@IsVBaseQueue(MonutKey)
// 	async loadAnother() {
// 		console.log("[loadAnother] start", Date.now());
// 		await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
// 		console.log("[loadAnother] done", Date.now());
// 	}

// 	@IsVBaseQueue(UnmountKey)
// 	cleanup() {
// 		console.log("[cleanup] called");
// 	}

// 	addPostSetupMount() {
// 		console.log("[setup] push a post-setup mount task");
// 		(this.mountQueue = this.mountQueue || []).push(() => {
// 			console.log("[post-setup mount] running");
// 			return new Promise((r) => setTimeout(r, 200));
// 		});
// 	}

// 	addPostSetupUnmount() {
// 		console.log("[setup] push a post-setup unmount task");
// 		(this.unmountQueue = this.unmountQueue || []).push(() => {
// 			console.log("[post-setup unmount] running");
// 		});
// 	}
// }
// customElements.define("demo-elem", DemoElem);

// // demo runner（自动创建组件，不需手动调用任何方法）
// function demoRun() {
// 	const container = document.createElement("div");
// 	document.body.appendChild(container);

// 	for (let i = 0; i < 3; i++) {
// 		const e = document.createElement("demo-elem") as any;
// 		container.appendChild(e);
// 		// 不再需要手动调用 e.setup() / e.loadHeavyResource() / e.loadAnother()
// 	}

// 	// 5 秒后移除所有元素，触发 unmount 队列
// 	setTimeout(() => {
// 		container.innerHTML = "";
// 	}, 8000);
// }

// if (typeof window !== "undefined") {
// 	window.addEventListener("load", demoRun);
// }
