import { describe, it } from "node:test";
import { validDateTimeSchema, validDateSchema } from "../date-time.ts";
import assert from "node:assert/strict";

await describe("validDateTimeSchema", async () => {
	await describe("when called given a string that represents a valid date-time", async () => {
		const result = validDateTimeSchema.parse("2021-01-01T00:00:00.000Z");

		await it("returns the date-time as a string", () => {
			assert.equal(typeof result, "string");
			assert.equal(result, "2021-01-01T00:00:00.000Z");
		});
	});

	await describe("when called given a string that represents an invalid date-time", async () => {
		await it("throws an error", async () => {
			assert.throws(() => validDateTimeSchema.parse("invalid date-time"));
		});
	});
});

await describe("validDateSchema", async () => {
	await describe("when called given a string that represents a valid date", async () => {
		const result = validDateSchema.parse("2021-01-01");

		await it("returns the date as a string", () => {
			assert.equal(typeof result, "string");
			assert.equal(result, "2021-01-01");
		});
	});

	await describe("when called given a string that represents an invalid date", async () => {
		await it("throws an error", async () => {
			assert.throws(() => validDateSchema.parse("invalid date"));
		});
	});
});
