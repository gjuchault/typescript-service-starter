import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	concat,
	filter,
	flat,
	flatMap,
	isNonEmptyArray,
	toNonEmptyArray,
	map,
	reverse,
	slice,
} from "../non-empty-array.ts";

await describe("concat()", async () => {
	await describe("when called given multiple arrays, the first one being a non-empty array", async () => {
		const result = concat(
			toNonEmptyArray(["a", "b", "c"]),
			["d", "e"],
			[],
			["f"],
		);

		await it("returns the concatenation of the arrays as a non-empty array", () => {
			assert.equal(Array.isArray(result), true);
			assert.equal(typeof result[0], "string");
			assert.deepEqual(result, ["a", "b", "c", "d", "e", "f"]);
		});
	});
});

await describe("filter()", async () => {
	await describe("when called given a non-empty array and a predicate", async () => {
		const result = filter(
			toNonEmptyArray([0, 1, 2, 3, 4, 5, 6]),
			(value) => value % 2 === 0,
		);

		await it("returns a subset array", () => {
			assert.deepEqual(result, [0, 2, 4, 6]);
		});
	});
});

await describe("flat()", async () => {
	await describe("when called given a non-empty array, a predicate and no depth parameter", async () => {
		const result = flat(toNonEmptyArray([0, [[1]], 2, [3], 4, [5, 6]]));

		await it("returns a subset array", () => {
			assert.deepEqual(result, [0, [1], 2, 3, 4, 5, 6]);
		});
	});

	await describe("when called given a non-empty array, a predicate and a depth parameter", async () => {
		const result = flat(toNonEmptyArray([0, [[1]], 2, [3], 4, [5, 6]]), 10);

		await it("returns a subset array", () => {
			assert.deepEqual(result, [0, 1, 2, 3, 4, 5, 6]);
		});
	});
});

await describe("flatMap()", async () => {
	await describe("when called given a non-empty array, a predicate and no depth parameter", async () => {
		const result = flatMap(toNonEmptyArray([[0, 1, 2], [5], [0]]), (value) =>
			value.reduce((a, b) => a + b, 0),
		);

		await it("returns a subset array", () => {
			assert.deepEqual(result, [3, 5, 0]);
		});
	});
});

await describe("isNonEmptyArray()", async () => {
	await describe("when called given a non-empty array", async () => {
		const result = isNonEmptyArray([1, 2, 3]);

		await it("returns true", () => {
			assert.equal(result, true);
		});
	});

	await describe("when called given an empty array", async () => {
		const result = isNonEmptyArray([]);

		await it("returns true", () => {
			assert.equal(result, false);
		});
	});
});

await describe("isNonEmptyArray()", async () => {
	await describe("when called given a non-empty array", async () => {
		const result = isNonEmptyArray([1, 2, 3]);

		await it("returns true", () => {
			assert.equal(result, true);
		});
	});

	await describe("when called given an empty array", async () => {
		const result = isNonEmptyArray([]);

		await it("returns true", () => {
			assert.equal(result, false);
		});
	});
});

await describe("map()", async () => {
	await describe("when called given a non-empty array and a predicate", async () => {
		const result = map(toNonEmptyArray([1, 2, 3]), (value) => value * 2);

		await it("returns the modified array", () => {
			assert.deepEqual(result, [2, 4, 6]);
		});
	});
});

await describe("reverse()", async () => {
	await describe("when called given a non-empty array and a predicate", async () => {
		const result = reverse(toNonEmptyArray([1, 2, 3]));

		await it("returns the modified array", () => {
			assert.deepEqual(result, [3, 2, 1]);
		});
	});
});

await describe("slice()", async () => {
	await describe("when called given a non-empty array and a range in the array", async () => {
		const result = slice(toNonEmptyArray([1, 2, 3]), 1, 2);

		await it("returns the slice array in a some", () => {
			assert.deepEqual(result, [2]);
		});
	});

	await describe("when called given a non-empty array and a range outside the array", async () => {
		const result = slice(toNonEmptyArray([1, 2, 3]), 5);

		await it("returns none", () => {
			assert.equal(result, undefined);
		});
	});
});
