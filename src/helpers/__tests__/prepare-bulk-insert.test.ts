import { describe, it } from "node:test";
import { deepEqual } from "node:assert/strict";
import { prepareBulkInsert } from "../prepare-bulk-insert.ts";
import { sql } from "slonik";

await describe("prepareBulkInsert()", async () => {
	await describe("when called, given column definitions, an object and an iterator", async () => {
		const result = prepareBulkInsert(
			[
				["id", "int4"],
				["name", "text"],
				["date", "int4"],
				["date2", "timestamptz"],
				["raw", "json"],
			],
			[
				{
					id: 1,
					name: "one",
					date: new Date("2020-01-01"),
					date2: new Date("2020-01-01"),
					raw: { foo: 1 },
				},
				{
					id: 2,
					name: "two",
					date: new Date("2020-01-02"),
					date2: new Date("2020-01-02"),
					raw: { foo: 2 },
				},
			],
			(record) => ({
				...record,
				date: record.date.getTime(),
			}),
		);

		it("returns columns and rows", () => {
			deepEqual(result.columns.members, [
				sql.identifier(["id"]),
				sql.identifier(["name"]),
				sql.identifier(["date"]),
				sql.identifier(["date2"]),
				sql.identifier(["raw"]),
			]);
			deepEqual(result.rows.tuples, [
				[1, "one", 1577836800000, "2020-01-01T00:00:00.000Z", '{"foo":1}'],
				[2, "two", 1577923200000, "2020-01-02T00:00:00.000Z", '{"foo":2}'],
			]);
		});
	});
});
