import { deepEqual, equal } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sql } from "slonik";
import * as z from "zod";
import {
	type SetupResult,
	setup,
} from "../../../../../test-helpers/test-setup.ts";

await describe("GET /api/users", async () => {
	let setupResult: SetupResult;

	await before(async () => {
		try {
			setupResult = await setup();

			await setupResult.database.query(sql.type(z.unknown())`
				insert into users (id, name, email) values
					(1, 'Alice', 'alice@gmail.com'),
					(2, 'Bob', 'bob@gmail.com');
			`);
			console.log("before ends");
		} catch (err) {
			console.log("setup error", err);
			throw err;
		}
	});

	await after(async () => {
		try {
			await setupResult.cleanup();
		} catch (err) {
			console.log("after fails");
		}
	});

	await it("returns every user when called with no ids", async () => {
		console.log("before inject");
		const result = await setupResult.httpServer.inject({
			method: "GET",
			url: "/api/users",
		});
		console.log("after inject");

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
