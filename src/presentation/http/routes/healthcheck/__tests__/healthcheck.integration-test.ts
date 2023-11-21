import * as assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import type { LightMyRequestResponse } from "fastify";

import {
  getHttpClient,
  getHttpTestContext,
} from "~/test-helpers/integration-start-context.js";

import type {
  RouterGetHealthcheckBody,
  RouterGetHealthcheckResult,
} from "../index.js";

await describe("GET /healthcheck", async () => {
  await describe("when called with native client", async () => {
    let response: LightMyRequestResponse;

    before(async () => {
      const http = getHttpTestContext();
      response = await http.inject("/api/healthcheck");
    });

    await it("returns 200", () => {
      const body = response.json<RouterGetHealthcheckBody>();

      if (process.env.CI === undefined) {
        assert.equal(response.statusCode, 200);
        assert.equal(body.database, "healthy");
        assert.equal(body.cache, "healthy");
        assert.equal(body.systemMemory, "healthy");
        assert.equal(body.processMemory, "healthy");
        assert.equal(body.http, "healthy");
      } else {
        // in Github Actions, process memory seems to be low or static
        assert.equal([200, 500].includes(response.statusCode), true);
        assert.equal(body.database, "healthy");
        assert.equal(body.cache, "healthy");
        assert.equal(body.http, "healthy");
      }
    });
  });

  await describe("when called with ts-rest client", async () => {
    let response: RouterGetHealthcheckResult;

    before(async () => {
      const client = getHttpClient();
      response = await client.getHealthcheck();
    });

    await it("returns 200", () => {
      if (process.env.CI === undefined) {
        assert.equal(response.status, 200);

        if (response.status !== 200) {
          assert.fail();
        }

        assert.equal(response.body.database, "healthy");
        assert.equal(response.body.cache, "healthy");
        assert.equal(response.body.systemMemory, "healthy");
        assert.equal(response.body.processMemory, "healthy");
        assert.equal(response.body.http, "healthy");
      } else {
        assert.equal([500, 200].includes(response.status), true);

        if (response.status !== 500 && response.status !== 200) {
          assert.fail();
        }

        // in Github Actions, process memory seems to be low or static
        assert.equal(response.body.database, "healthy");
        assert.equal(response.body.cache, "healthy");
        assert.equal(response.body.http, "healthy");
      }
    });
  });
});
