import type { Mock } from "node:test";

type MockInput<T extends Record<string, Record<string, unknown>>> = Partial<{
	[K in keyof T]: Partial<T[K]>;
}>;

type Mocked<T extends Record<string, Record<string, unknown>>> = {
	[K in keyof T]: {
		// biome-ignore lint/complexity/noBannedTypes: mocked function
		[P in keyof T[K]]: T[K][P] extends Function ? Mock<T[K][P]> : T[K][P];
	};
};

function mockDependency<T extends Record<string, unknown>>(
	name: string,
	partialObject: Partial<T>,
): T {
	return new Proxy(partialObject, {
		get(_, prop: string) {
			if (typeof partialObject[prop] === "function") {
				return partialObject[prop];
			}

			if (prop in partialObject) {
				return partialObject[prop];
			}

			return () => {
				throw new Error(
					`Function has not been mocked on dependency ${name}.${prop}()`,
				);
			};
		},
	}) as T;
}

export function mockDependencies<
	T extends Record<string, Record<string, unknown>>,
>(partialObject: MockInput<T>): Mocked<T> {
	return new Proxy(partialObject, {
		get(_, prop: string) {
			return mockDependency(prop, partialObject[prop] ?? {});
		},
	}) as Mocked<T>;
}
