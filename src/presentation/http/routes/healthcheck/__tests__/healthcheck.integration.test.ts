import test from "ava";
import { setup } from "../../../../../test-utils/integration-start-context";

test("healthcheck", async (t) => {
  const { http, shutdown } = await setup();

  const response = await http.inject("/healthcheck");

  t.is(response.statusCode, 200);

  const body = response.json();

  t.is(body.database, "healthy");
  t.is(body.cache, "healthy");
  t.is(body.systemMemory, "healthy");
  t.is(body.processMemory, "healthy");
  t.is(body.http, "healthy");

  t.teardown(() => shutdown());
});
