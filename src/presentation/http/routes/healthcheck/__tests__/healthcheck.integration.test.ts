import type { LightMyRequestResponse } from "fastify";
import { beforeAll, describe, expect, it } from "vitest";

import {
  getHttpClient,
  getHttpTestContext,
} from "~/test-helpers/integration-start-context.js";

import type {
  RouterGetHealthcheckBody,
  RouterGetHealthcheckResult,
} from "../index.js";

describe("GET /healthcheck", () => {
  describe("when called with native client", () => {
    let response: LightMyRequestResponse;

    beforeAll(async () => {
      const http = getHttpTestContext();
      response = await http.inject("/api/healthcheck");
    });

    it("returns 200", () => {
      const body = response.json<RouterGetHealthcheckBody>();

      if (process.env.CI === undefined) {
        expect(response.statusCode).toBe(200);
        expect(body.database).toBe("healthy");
        expect(body.cache).toBe("healthy");
        expect(body.systemMemory).toBe("healthy");
        expect(body.processMemory).toBe("healthy");
        expect(body.http).toBe("healthy");
      } else {
        // in Github Actions, process memory seems to be low or static
        expect([200, 500].includes(response.statusCode)).toBe(true);
        expect(body.database).toBe("healthy");
        expect(body.cache).toBe("healthy");
        expect(body.http).toBe("healthy");
      }
    });
  });

  describe("when called with ts-rest client", () => {
    let response: RouterGetHealthcheckResult;

    beforeAll(async () => {
      const client = getHttpClient();
      response = await client.getHealthcheck();
    });

    it("returns 200", () => {
      if (process.env.CI === undefined) {
        expect(response.status).toBe(200);

        if (response.status !== 200) {
          expect.fail();
        }

        expect(response.body.database).toBe("healthy");
        expect(response.body.cache).toBe("healthy");
        expect(response.body.systemMemory).toBe("healthy");
        expect(response.body.processMemory).toBe("healthy");
        expect(response.body.http).toBe("healthy");
      } else {
        expect(response.status).toBe(500);

        if (response.status !== 500) {
          expect.fail();
        }

        // in Github Actions, process memory seems to be low or static
        expect(response.body.database).toBe("healthy");
        expect(response.body.cache).toBe("healthy");
        expect(response.body.http).toBe("healthy");
      }
    });
  });
});
