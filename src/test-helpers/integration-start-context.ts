import { sql } from "slonik";
import { beforeAll } from "vitest";
import { startApp } from "../index";
import {
  buildMigration,
  databasePool,
  readMigrations,
} from "../infrastructure/database/migration";
import type { HttpServer } from "../infrastructure/http";

let http: HttpServer | undefined;

export function getHttpTestContext() {
  if (!http) {
    throw new Error("http not yet initialized");
  }

  return http;
}

beforeAll(async () => {
  const app = await startApp({
    port: 1987,
    logLevel: "error",
  });

  await databasePool.query(
    sql`
      do $$ declare
          r record;
      begin
          for r in (select tablename from pg_tables where schemaname not in ('pg_catalog', 'information_schema')) loop
              execute 'drop table if exists ' || quote_ident(r.tablename) || ' cascade';
          end loop;
      end $$;
    `
  );

  const migrationFiles = await readMigrations();

  const migration = buildMigration({
    databasePool,
    migrationFiles,
  });

  await migration.up();

  http = app.httpServer;

  return async () => {
    await app.shutdown.shutdown(false);
  };
});
