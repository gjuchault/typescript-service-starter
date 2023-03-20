import { describe, expect, it } from "vitest";
import { makeValidDate, makeValidDateTime } from "../date-time";

describe("makeValidDate()", () => {
  describe.each(["2022-01-01", "1980-12-31", "2090-02-21"])(
    "given a valid date",
    (date) => {
      describe("when called", () => {
        const result = makeValidDate(date);

        it("returns a valid date", () => {
          expect(result.some).toBe(true);

          if (result.some) {
            expect(result.val).toBe(date);
          }
        });
      });
    }
  );

  describe.each(["foobar", "2021-02-98"])("given an invalid date", (date) => {
    describe("when called", () => {
      const result = makeValidDate(date);

      it("returns none", () => {
        expect(result.none).toBe(true);
      });
    });
  });
});

describe("makeValidDateTime()", () => {
  describe.each(["2022-01-01T19:30:01.123Z"])("given a valid date", (date) => {
    describe("when called", () => {
      const result = makeValidDateTime(date);

      it("returns a valid date", () => {
        expect(result.some).toBe(true);

        if (result.some) {
          expect(result.val).toBe(date);
        }
      });
    });
  });

  describe.each(["foobar", "2021-02-98"])("given an invalid date", (date) => {
    describe("when called", () => {
      const result = makeValidDateTime(date);

      it("returns none", () => {
        expect(result.none).toBe(true);
      });
    });
  });
});
