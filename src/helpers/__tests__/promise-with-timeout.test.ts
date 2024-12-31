import { describe, it, mock } from "node:test";
import { equal, rejects } from "node:assert/strict";
import { promiseWithTimeout } from "../promise-with-timeout.ts";
import { setTimeout } from "node:timers/promises";

await describe("promiseWithTimeout()", async () => {
	await describe("when called given a timer and a promise that resolves in time", async () => {
		await it("resolves with the promise's value", async () => {
			const mockFn = mock.fn(async () => setTimeout(10, "success"));

			const result = await promiseWithTimeout(20, mockFn);

			equal(result, "success");
			equal(mockFn.mock.calls.length, 1);
		});
	});

	await describe("when called given a timer and a promise that doesn't resolves in time", async () => {
		await it("throws", async () => {
			const mockFn = mock.fn(async () => setTimeout(20, "success"));

			await rejects(promiseWithTimeout(10, mockFn));
		});
	});
});
