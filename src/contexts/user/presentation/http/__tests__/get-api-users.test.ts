import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { sql } from "slonik";
import {
	type SetupResult,
	setup,
} from "../../../../../test-helpers/test-setup.ts";

await test("GET /api/users", async (ctx) => {
	let setupResult: SetupResult;

	ctx.before(async () => {
		setupResult = await setup();

		await setupResult.database.query(sql.unsafe`
			insert into users (id, name, email) values
				(1, 'Alice', 'alice@gmail.com'),
				(2, 'Bob', 'bob@gmail.com');
		`);
	});

	ctx.after(async () => {
		await setupResult.cleanup();
	});

	await test("when called with no ids", async () => {
		const result = await setupResult.httpServer.inject({
			method: "GET",
			url: "/api/users",
		});

		equal(result.statusCode, 400);
	});

	await test("when called with a single id", async () => {
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

	await test("when called with multiple id", async () => {
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
