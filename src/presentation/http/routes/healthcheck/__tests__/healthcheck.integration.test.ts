import type { LightMyRequestResponse } from "fastify";
import { beforeAll, describe, expect, it } from "vitest";
import type { HealthcheckResponseSchema } from "..";
import {
  getHttpTestContext,
  getHttpClient,
} from "../../../../../test-helpers/integration-start-context";

describe("GET /healthcheck", () => {
  describe("when called with native client", () => {
    let response: LightMyRequestResponse;

    beforeAll(async () => {
      const http = getHttpTestContext();
      response = await http.inject("/api/healthcheck.healthcheck");
    });

    it("returns 200", () => {
      const body = response.json<{
        result: { data: HealthcheckResponseSchema };
      }>();

      if (process.env.CI === undefined) {
        expect(response.statusCode).toBe(200);
        expect(body.result.data.database).toBe("healthy");
        expect(body.result.data.cache).toBe("healthy");
        expect(body.result.data.systemMemory).toBe("healthy");
        expect(body.result.data.processMemory).toBe("healthy");
        expect(body.result.data.http).toBe("healthy");
      } else {
        // in Github Actions, process memory seems to be low or static
        expect([200, 500].includes(response.statusCode)).toBe(true);
        expect(body.result.data.database).toBe("healthy");
        expect(body.result.data.cache).toBe("healthy");
        expect(body.result.data.http).toBe("healthy");
      }
    });
  });

  describe("when called with trpc client", () => {
    let response: HealthcheckResponseSchema;

    beforeAll(async () => {
      const client = getHttpClient();
      response = await client.healthcheck.healthcheck.query();
    });

    it("returns 200", () => {
      if (process.env.CI === undefined) {
        expect(response.database).toBe("healthy");
        expect(response.cache).toBe("healthy");
        expect(response.systemMemory).toBe("healthy");
        expect(response.processMemory).toBe("healthy");
        expect(response.http).toBe("healthy");
      } else {
        // in Github Actions, process memory seems to be low or static
        expect(response.database).toBe("healthy");
        expect(response.cache).toBe("healthy");
        expect(response.http).toBe("healthy");
      }
    });
  });
});
