import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { err, ok } from "../result.ts";

await describe("ok()", async () => {
	await describe("when called, given a value", () => {
		it("return an ok element", () => {
			deepEqual(ok("test"), { ok: true, value: "test" });
		});
	});
});

await describe("err()", async () => {
	await describe("when called, given an error", () => {
		it("return an error element", () => {
			deepEqual(err("test"), { ok: false, error: "test" });
		});
	});
});
