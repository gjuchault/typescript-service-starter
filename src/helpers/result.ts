import { gen } from "ts-flowgen";

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

function getInstanceMethods<Object extends object>(
	instance: Object,
): (keyof Object)[] {
	const methods = new Set<string | symbol>();

	let obj: object = instance;
	do {
		const keys = Reflect.ownKeys(obj);
		keys.forEach((k) => methods.add(k));
		const nextObj = Reflect.getPrototypeOf(obj);

		if (nextObj === null) {
			break;
		}

		obj = nextObj;
	} while (obj !== undefined && obj !== null);

	return Array.from(methods).filter(
		(method): method is string =>
			typeof method === "string" &&
			method !== "constructor" &&
			typeof (instance as Record<string, unknown>)[method] === "function",
	) as (keyof Object)[];
}
