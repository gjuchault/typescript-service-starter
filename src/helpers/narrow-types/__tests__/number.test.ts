import { describe, expect, it } from "vitest";
import {
  makeNegativeInteger,
  makeNegativeNumber,
  makePositiveInteger,
  makePositiveNonZeroInteger,
  makePositiveNonZeroNumber,
  makePositiveNumber,
  makeSafeInteger,
} from "../number";

describe("makeNegativeInteger()", () => {
  describe.each([-1, -5, -1_209_302])(
    "given a valid negative integer",
    (number) => {
      describe("when called", () => {
        const result = makeNegativeInteger(number);

        it("returns true", () => {
          expect(result.some).toBe(true);
        });
      });
    }
  );

  describe.each([0, Number.NEGATIVE_INFINITY, 1000])(
    "given an invalid negative integer",
    (number) => {
      describe("when called", () => {
        const result = makeNegativeInteger(number);

        it("return false", () => {
          expect(result.some).toBe(false);
        });
      });
    }
  );
});

describe("makeNegativeNumber()", () => {
  describe.each([-1 / 3, -1.5, -1])(
    "given a valid negative number",
    (number) => {
      describe("when called", () => {
        const result = makeNegativeNumber(number);

        it("returns true", () => {
          expect(result.some).toBe(true);
        });
      });
    }
  );

  describe.each([0, 1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "given an invalid negative number",
    (number) => {
      describe("when called", () => {
        const result = makeNegativeNumber(number);

        it("return false", () => {
          expect(result.some).toBe(false);
        });
      });
    }
  );
});

describe("makePositiveInteger()", () => {
  describe.each([0, 1, 1000])("given a valid positive integer", (number) => {
    describe("when called", () => {
      const result = makePositiveInteger(number);

      it("returns true", () => {
        expect(result.some).toBe(true);
      });
    });
  });

  describe.each([
    1.5,
    -1,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1000,
  ])("given an invalid positive integer", (number) => {
    describe("when called", () => {
      const result = makePositiveInteger(number);

      it("return false", () => {
        expect(result.some).toBe(false);
      });
    });
  });
});

describe("makePositiveNonZeroInteger()", () => {
  describe.each([1, 1000])(
    "given a valid positive non zero number",
    (number) => {
      describe("when called", () => {
        const result = makePositiveNonZeroInteger(number);

        it("returns true", () => {
          expect(result.some).toBe(true);
        });
      });
    }
  );

  describe.each([
    1.5,
    -1,
    0,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1000,
  ])("given an invalid positive non-zero integer", (number) => {
    describe("when called", () => {
      const result = makePositiveNonZeroInteger(number);

      it("return false", () => {
        expect(result.some).toBe(false);
      });
    });
  });
});

describe("makePositiveNonZeroNumber()", () => {
  describe.each([1, 1.5, 1 / 3, 1000])(
    "given a valid positive non-zero number",
    (number) => {
      describe("when called", () => {
        const result = makePositiveNonZeroNumber(number);

        it("returns true", () => {
          expect(result.some).toBe(true);
        });
      });
    }
  );

  describe.each([0, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    "given an invalid positive non-zero number",
    (number) => {
      describe("when called", () => {
        const result = makePositiveNonZeroNumber(number);

        it("return false", () => {
          expect(result.some).toBe(false);
        });
      });
    }
  );
});

describe("makePositiveNumber", () => {
  describe.each([0, 1.5, 1 / 3, 1000])(
    "given a valid positive number",
    (number) => {
      describe("when called", () => {
        const result = makePositiveNumber(number);

        it("returns true", () => {
          expect(result.some).toBe(true);
        });
      });
    }
  );

  describe.each([
    -1,
    -1 / 3,
    -1.5,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("given an invalid positive number", (number) => {
    describe("when called", () => {
      const result = makePositiveNumber(number);

      it("return false", () => {
        expect(result.some).toBe(false);
      });
    });
  });
});

describe("makeSafeInteger", () => {
  describe.each([-1, 0, 1])("given a number", (number) => {
    describe("when called", () => {
      const result = makeSafeInteger(number);

      it("returns true", () => {
        expect(result.some).toBe(true);
      });
    });
  });

  describe.each([
    -1 / 3,
    1 / 3,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("given a number", (number) => {
    describe("when called", () => {
      const result = makeSafeInteger(number);

      it("return false", () => {
        expect(result.some).toBe(false);
      });
    });
  });
});
