import { deepEqual, equal } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sql } from "slonik";
import { unsafeFlowOrThrow } from "ts-flowgen";
import * as z from "zod";
import {
	type SetupResult,
	setup,
} from "../../../../../test-helpers/test-setup.ts";

await describe("GET /api/users", async () => {
	let setupResult: SetupResult;

	await before(async () => {
		setupResult = await unsafeFlowOrThrow(setup);

		await unsafeFlowOrThrow(() =>
			setupResult.database.query(sql.type(z.unknown())`
				insert into users (id, name, email) values
					(1, 'Alice', 'alice@gmail.com'),
					(2, 'Bob', 'bob@gmail.com');
			`),
		);
	});

	await after(async () => {
		await unsafeFlowOrThrow(setupResult.cleanup);
	});

	await it("returns every user when called with no ids", async () => {
		const result = await setupResult.httpServer.inject({
			method: "GET",
			url: "/api/users",
		});

		equal(result.statusCode, 200);
		deepEqual(result.json(), [
			{ id: 1, name: "Alice", email: "alice@gmail.com" },
			{ id: 2, name: "Bob", email: "bob@gmail.com" },
		]);
	});

	await it("return a single user when called with a single id", async () => {
		const result = await setupResult.httpServer.inject({
			method: "GET",
			url: "/api/users",
			query: { ids: "1" },
		});

		equal(result.statusCode, 200);
		deepEqual(result.json(), [
			{ id: 1, name: "Alice", email: "alice@gmail.com" },
		]);
	});

	await it("returns multiple users when called with multiple id", async () => {
		const result = await setupResult.httpServer.inject({
			method: "GET",
			url: "/api/users",
			query: { ids: ["1", "2", "3"] },
		});

		equal(result.statusCode, 200);
		deepEqual(result.json(), [
			{ id: 1, name: "Alice", email: "alice@gmail.com" },
			{ id: 2, name: "Bob", email: "bob@gmail.com" },
		]);
	});
});
