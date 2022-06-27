import { beforeAll } from "vitest";
import { startApp } from "../index";
import type { HttpServer } from "../infrastructure/http";

export let http: HttpServer;

beforeAll(async () => {
  const app = await startApp({
    port: 1987,
    logLevel: "error",
  });

  http = app.httpServer;

  return async () => {
    await app.shutdown.shutdown(false);
  };
});
