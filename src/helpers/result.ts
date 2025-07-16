import { flow, gen } from "ts-flowgen";

export type WrappedObjectMethods<Object, Error> = {
	[K in keyof Object]: Object[K] extends (...args: infer Args) => infer Return
		? (
				...args: Args
			) => Return extends Promise<infer P>
				? AsyncGenerator<Error, P>
				: AsyncGenerator<Error, Return>
		: Object[K];
} & { unwrapped: Object };

export function wrapObjectMethods<Object, Error>(
	obj: Object,
	unhandledError: (err: unknown) => Error,
): WrappedObjectMethods<Object, Error> {
	const wrappedObj = {} as WrappedObjectMethods<Object, Error>;

	if (typeof obj !== "object" || obj === null) {
		return obj as WrappedObjectMethods<Object, Error>;
	}

	for (const [key, value] of Object.entries(obj)) {
		Object.defineProperty(wrappedObj, key, {
			value:
				typeof value === "function"
					? gen(value.bind(obj), unhandledError)
					: value,
			writable: true,
			enumerable: true,
			configurable: true,
		});
	}

	if (obj.constructor !== Object) {
		for (const key of getInstanceMethods(obj)) {
			Object.defineProperty(wrappedObj, key, {
				value:
					typeof obj[key] === "function"
						? gen(obj[key].bind(obj), unhandledError)
						: obj[key],
				writable: true,
				enumerable: true,
				configurable: true,
			});
		}
	}

	return { ...wrappedObj, unwrapped: obj };
}

function getInstanceMethods<Object>(instance: Object): (keyof Object)[] {
	return Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
		(key) => key !== "constructor",
	) as (keyof Object)[];
}

export async function* noop(): AsyncGenerator<never, void> {}

export async function* noopReturn<T>(value: T): AsyncGenerator<never, T> {
	yield* noop();
	return value;
}

export function unwrap<Value>(
	result: { ok: true; value: Value } | { ok: false; error: unknown },
): Value {
	if (result.ok === false) {
		throw new Error("Unwrapping error", { cause: result.error });
	}

	return result.value;
}

export async function flowOrThrow<Value>(
	callback: () => AsyncGenerator<unknown, Value>,
): Promise<Value> {
	return unwrap(await flow(callback));
}
