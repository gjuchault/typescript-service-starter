import { deepEqual, fail } from "node:assert/strict";
import { describe, it } from "node:test";
import { flow } from "ts-flowgen";
import { wrapObjectMethods } from "../result.ts";

await describe("wrapObjectMethods()", async () => {
	await describe("when called, given an object", async () => {
		await it("returns an object with the same methods wrapped in Result", async () => {
			const obj = {
				syncMethod: () => "test",
				asyncMethod: async () => "test",
				throwingMethod: () => {
					throw new Error("test");
				},
				staticValue: "test",
			};

			const wrappedObj = wrapObjectMethods(
				obj,
				(cause) => new Error("test wrapped", { cause }),
			);

			const syncMethodResult = await flow(wrappedObj.syncMethod);
			const asyncMethodResult = await flow(wrappedObj.asyncMethod);
			const throwingMethodResult = await flow(wrappedObj.throwingMethod);

			if (syncMethodResult.ok === false) {
				fail("syncMethodResult should not be an error");
			}

			if (asyncMethodResult.ok === false) {
				fail("asyncMethodResult should not be an error");
			}

			if (throwingMethodResult.ok === true) {
				fail("throwingMethodResult should be an error");
			}

			deepEqual(syncMethodResult.value, "test");
			deepEqual(asyncMethodResult.value, "test");
			deepEqual(wrappedObj.staticValue, "test");
			deepEqual(
				throwingMethodResult.error,
				new Error("test wrapped", { cause: new Error("test") }),
			);
		});
	});

	await describe("when called, given an class instance", async () => {
		await it("returns an object with the same methods wrapped in Result", async () => {
			class TestClass {
				staticValue = "test";

				syncMethod() {
					return "test";
				}

				async asyncMethod() {
					return "test";
				}

				throwingMethod() {
					throw new Error("test");
				}
			}

			const wrappedObj = wrapObjectMethods(
				new TestClass(),
				(cause) => new Error("test wrapped", { cause }),
			);

			const syncMethodResult = await flow(wrappedObj.syncMethod);
			const asyncMethodResult = await flow(wrappedObj.asyncMethod);
			const throwingMethodResult = await flow(wrappedObj.throwingMethod);

			if (syncMethodResult.ok === false) {
				fail("syncMethodResult should not be an error");
			}

			if (asyncMethodResult.ok === false) {
				fail("asyncMethodResult should not be an error");
			}

			if (throwingMethodResult.ok === true) {
				fail("throwingMethodResult should be an error");
			}

			deepEqual(syncMethodResult.value, "test");
			deepEqual(asyncMethodResult.value, "test");
			deepEqual(wrappedObj.staticValue, "test");
			deepEqual(
				throwingMethodResult.error,
				new Error("test wrapped", { cause: new Error("test") }),
			);
		});
	});
});
