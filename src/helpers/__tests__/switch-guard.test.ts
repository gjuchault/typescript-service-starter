import { throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { switchGuard } from "../switch-guard.ts";

await describe("switchGuard()", async () => {
	await describe("when called given a value and a cause", async () => {
		await it("throws an error with the unexpected value and the cause", () => {
			const input = "test";
			const cause = "test";

			throws(() => switchGuard(input as never, cause), {
				message: `Unexpected value: ${input}`,
				cause,
			});
		});
	});
});
