import { equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
	databaseTimestampToInstant,
	instantToDatabaseTimestamp,
	isValidDatabaseTimestamp,
} from "../temporal.ts";

await describe("databaseTimestampToInstant()", async () => {
	await describe("given a number", async () => {
		await it("returns a Temporal.Instant", async () => {
			ok(
				databaseTimestampToInstant(1620000000000).equals(
					Temporal.Instant.from("2021-05-03T00:00:00Z"),
				),
			);

			throws(() =>
				databaseTimestampToInstant(NaN).equals(
					Temporal.Instant.from("2020-01-01T00:00:00Z"),
				),
			);
		});
	});

	await describe("given a date", async () => {
		await it("returns a Temporal.Instant", async () => {
			ok(
				databaseTimestampToInstant(new Date("2020-01-01T00:00:00.000Z")).equals(
					Temporal.Instant.from("2020-01-01T00:00:00Z"),
				),
			);

			throws(() =>
				databaseTimestampToInstant(new Date("zyx")).equals(
					Temporal.Instant.from("2020-01-01T00:00:00Z"),
				),
			);
		});
	});

	await describe("given a string", async () => {
		await it("returns a Temporal.Instant", async () => {
			ok(
				databaseTimestampToInstant("2020-01-01T00:00:00.000Z").equals(
					Temporal.Instant.from("2020-01-01T00:00:00Z"),
				),
			);

			throws(() =>
				databaseTimestampToInstant("zyx").equals(
					Temporal.Instant.from("2020-01-01T00:00:00Z"),
				),
			);
		});
	});
});

await describe("instantToDatabaseTimestamp()", async () => {
	await describe("given a Temporal.Instant", async () => {
		await it("returns a string", async () => {
			equal(
				instantToDatabaseTimestamp(
					Temporal.Instant.from("2020-01-01T00:00:00.000Z"),
				),
				"2020-01-01T00:00:00Z",
			);
		});
	});
});

await describe("isValidDatabaseTimestamp()", async () => {
	await describe("given a valid input", async () => {
		await it("returns true", async () => {
			ok(isValidDatabaseTimestamp(1620000000000));
			ok(isValidDatabaseTimestamp("2020-01-01T00:00:00.000Z"));
			ok(isValidDatabaseTimestamp("2020-01-01T00:00:00Z"));
			ok(isValidDatabaseTimestamp(new Date("2020-01-01T00:00:00.000Z")));
		});
	});

	await describe("given an invalid input", async () => {
		await it("returns false", async () => {
			ok(!isValidDatabaseTimestamp(NaN));
			ok(!isValidDatabaseTimestamp("zyx"));
			ok(!isValidDatabaseTimestamp(new Date("zyx")));
		});
	});
});
