import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { sql } from "slonik";
import { beforeAll } from "vitest";
import { z } from "zod";
import { startApp, AppRouter } from "../index";
import {
  buildMigration,
  readMigrations,
} from "../infrastructure/database/migration";
import type { HttpServer } from "../infrastructure/http";

let http: HttpServer | undefined;
let client: ReturnType<typeof createTRPCProxyClient<AppRouter>> | undefined;

export function getHttpTestContext() {
  if (!http) {
    throw new Error("http not yet initialized");
  }

  return http;
}

export function getHttpClient() {
  if (!client) {
    throw new Error("client not yet initialized");
  }

  return client;
}

beforeAll(async () => {
  const app = await startApp({
    port: 1987,
    logLevel: "error",
  });

  const {
    database,
    httpServer,
    shutdown: { shutdown },
  } = app;

  http = httpServer;

  client = createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: "http://0.0.0.0:1987/api",
      }),
    ],
  });

  await database.query(
    sql.type(z.unknown())`
      do $$ declare
          r record;
      begin
          for r in (select tablename from pg_tables where schemaname not in ('pg_catalog', 'information_schema')) loop
              execute 'drop table if exists ' || quote_ident(r.tablename) || ' cascade';
          end loop;
      end $$;
    `
  );

  const migrationFiles = await readMigrations(database);

  const migration = buildMigration({
    database,
    migrationFiles,
  });

  await migration.up();

  return async () => {
    await shutdown(false);
  };
});
