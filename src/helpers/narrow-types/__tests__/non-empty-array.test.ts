import { describe, it, expect, expectTypeOf } from "vitest";
import {
  concat,
  filter,
  flat,
  flatMap,
  makeNonEmptyArray,
  isNonEmptyArray,
  map,
  reverse,
  slice,
} from "../non-empty-array";

describe("concat()", () => {
  describe("given multiple arrays, the first one being a non-empty array", () => {
    describe("when called", () => {
      const result = concat(
        makeNonEmptyArray(["a", "b", "c"]).unwrap(),
        ["d", "e"],
        [],
        ["f"]
      );

      it("returns the concatenation of the arrays as a non-empty array", () => {
        expectTypeOf(result).toBeArray();
        expectTypeOf(result[0]).toBeString();
        expect(result).toEqual(["a", "b", "c", "d", "e", "f"]);
      });
    });
  });
});

describe("filter()", () => {
  describe("given a non-empty array and a predicate", () => {
    describe("when called", () => {
      const result = filter(
        makeNonEmptyArray([0, 1, 2, 3, 4, 5, 6]).unwrap(),
        (value) => value % 2 === 0
      );

      it("returns a subset array", () => {
        expect(result.some).toBe(true);

        if (result.some) {
          expect(result.val).toEqual([0, 2, 4, 6]);
        } else {
          expect.fail();
        }
      });
    });
  });
});

describe("flat()", () => {
  describe("given a non-empty array, a predicate and no depth parameter", () => {
    describe("when called", () => {
      const result = flat(
        makeNonEmptyArray([0, [[1]], 2, [3], 4, [5, 6]]).unwrap()
      );

      it("returns a subset array", () => {
        expect(result).toEqual([0, [1], 2, 3, 4, 5, 6]);
      });
    });
  });

  describe("given a non-empty array, a predicate and a depth parameter", () => {
    describe("when called", () => {
      const result = flat(
        makeNonEmptyArray([0, [[1]], 2, [3], 4, [5, 6]]).unwrap(),
        10
      );

      it("returns a subset array", () => {
        expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
      });
    });
  });
});

describe("flatMap()", () => {
  describe("given a non-empty array, a predicate and no depth parameter", () => {
    describe("when called", () => {
      const result = flatMap(
        makeNonEmptyArray([[0, 1, 2], [5], [0]]).unwrap(),
        (value) => value.reduce((a, b) => a + b, 0)
      );

      it("returns a subset array", () => {
        expect(result).toEqual([3, 5, 0]);
      });
    });
  });
});

describe("isNonEmptyArray()", () => {
  describe("given a non-empty array", () => {
    describe("when called", () => {
      const result = isNonEmptyArray([1, 2, 3]);

      it("returns true", () => {
        expect(result).toBe(true);
      });
    });
  });

  describe("given an empty array", () => {
    describe("when called", () => {
      const result = isNonEmptyArray([]);

      it("returns true", () => {
        expect(result).toBe(false);
      });
    });
  });
});

describe("isNonEmptyArray()", () => {
  describe("given a non-empty array", () => {
    describe("when called", () => {
      const result = isNonEmptyArray([1, 2, 3]);

      it("returns true", () => {
        expect(result).toBe(true);
      });
    });
  });

  describe("given an empty array", () => {
    describe("when called", () => {
      const result = isNonEmptyArray([]);

      it("returns true", () => {
        expect(result).toBe(false);
      });
    });
  });
});

describe("map()", () => {
  describe("given a non-empty array and a predicate", () => {
    describe("when called", () => {
      const result = map(
        makeNonEmptyArray([1, 2, 3]).unwrap(),
        (value) => value * 2
      );

      it("returns the modified array", () => {
        expect(result).toEqual([2, 4, 6]);
      });
    });
  });
});

describe("reverse()", () => {
  describe("given a non-empty array and a predicate", () => {
    describe("when called", () => {
      const result = reverse(makeNonEmptyArray([1, 2, 3]).unwrap());

      it("returns the modified array", () => {
        expect(result).toEqual([3, 2, 1]);
      });
    });
  });
});

describe("slice()", () => {
  describe("given a non-empty array and a range in the array", () => {
    describe("when called", () => {
      const result = slice(makeNonEmptyArray([1, 2, 3]).unwrap(), 1, 2);

      it("returns the slice array in a some", () => {
        expect(result.some).toBe(true);

        if (result.some) {
          expect(result.val).toEqual([2]);
        } else {
          expect.fail();
        }
      });
    });
  });

  describe("given a non-empty array and a range outside the array", () => {
    describe("when called", () => {
      const result = slice(makeNonEmptyArray([1, 2, 3]).unwrap(), 5);

      it("returns none", () => {
        expect(result.none).toBe(true);
      });
    });
  });
});
