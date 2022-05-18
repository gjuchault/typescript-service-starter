import test from "ava";
import { setup } from "../../../../../test-utils/integration-start-context";

test("healthcheck", async (t) => {
  const { http, shutdown } = await setup();

  const response = await http.inject("/healthcheck");

  const body = response.json();

  if (process.env.CI === "undefined") {
    t.is(response.statusCode, 200);
    t.is(body.database, "healthy");
    t.is(body.cache, "healthy");
    t.is(body.systemMemory, "healthy");
    t.is(body.processMemory, "healthy");
    t.is(body.http, "healthy");
  } else {
    t.is(response.statusCode, 500);
    t.is(body.database, "healthy");
    t.is(body.cache, "healthy");
    t.is(body.http, "healthy");
  }

  t.teardown(() => shutdown());
});
