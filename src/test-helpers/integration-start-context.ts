import { sql } from "slonik";
import { beforeAll } from "vitest";
import { databasePool, migrate } from "../../scripts/migrate";
import { startApp } from "../index";
import type { HttpServer } from "../infrastructure/http";

export let http: HttpServer;

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

  await migrate(["up"], false);

  http = app.httpServer;

  return async () => {
    await app.shutdown.shutdown(false);
  };
});
