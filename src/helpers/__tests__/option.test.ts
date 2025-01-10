import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isNone, isSome, none, some } from "../option.ts";

await describe("some()", async () => {
	await describe("when called, given anything", async () => {
		await it("should return the value", () => {
			const value = { foo: "bar" };
			const result = some(value);

			assert.strictEqual(result, value);
		});
	});
});

await describe("none()", async () => {
	await describe("when called", async () => {
		await it("should return undefined", () => {
			const result = none();

			assert.strictEqual(result, undefined);
		});
	});
});

await describe("isNone()", async () => {
	await describe("when called, given none()", async () => {
		await it("should return true", () => {
			const result = isNone(none());

			assert.strictEqual(result, true);
		});
	});

	await describe("when called, given some()", async () => {
		await it("should return false", () => {
			const result = isNone(some({ foo: "bar" }));

			assert.strictEqual(result, false);
		});
	});
});

await describe("isSome()", async () => {
	await describe("when called, given some()", async () => {
		await it("should return true", () => {
			const result = isSome(some({ foo: "bar" }));

			assert.strictEqual(result, true);
		});
	});

	await describe("when called, given none()", async () => {
		await it("should return false", () => {
			const result = isSome(none());

			assert.strictEqual(result, false);
		});
	});
});
