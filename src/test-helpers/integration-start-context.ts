import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import {
  dropAllTables,
  buildMigration,
  extractMigrations,
  type HttpServer,
} from "@gjuchault/typescript-service-sdk";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { beforeAll } from "vitest";
import { startApp, AppRouter } from "../index.js";

let http: HttpServer | undefined;
let client: ReturnType<typeof createTRPCProxyClient<AppRouter>> | undefined;

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const migrationsPath = path.join(__dirname, "../../migrations");

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
  const app = await startApp();

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

  await database.query(dropAllTables());

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const rawMigrationsFiles = await fs.readdir(migrationsPath);
  const migrationFiles = await extractMigrations(
    database,
    rawMigrationsFiles.map((file) => path.resolve(migrationsPath, file))
  );

  const migration = buildMigration({
    database,
    migrationFiles,
  });

  await migration.up();

  return async () => {
    await shutdown(false);
  };
});
