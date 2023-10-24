import fs from "node:fs/promises";
import path from "node:path";
import { after, before } from "node:test";
import url from "node:url";

import type {
  HttpServer,
  ShutdownManager,
} from "@gjuchault/typescript-service-sdk";
import {
  buildMigration,
  dropAllTables,
  extractMigrations,
} from "@gjuchault/typescript-service-sdk";
import { initClient } from "@ts-rest/core";
import type { DatabasePool } from "slonik";

import { routerContract } from "~/presentation/http/index.js";

import { startApp } from "../index.js";

let http: HttpServer | undefined;
let client: ReturnType<typeof initTestClient> | undefined;

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const migrationsPath = path.join(__dirname, "../../migrations");

export function getHttpTestContext() {
  if (http === undefined) {
    throw new Error("http not yet initialized");
  }

  return http;
}

export function getHttpClient() {
  if (client === undefined) {
    throw new Error("client not yet initialized");
  }

  return client;
}

function initTestClient() {
  return initClient(routerContract, {
    baseUrl: "http://0.0.0.0:1987/api",
    baseHeaders: {},
  });
}

let app: {
  httpServer: HttpServer;
  database: DatabasePool;
  shutdown: ShutdownManager;
};

before(async () => {
  app = await startApp();

  const { database, httpServer } = app;

  http = httpServer;

  client = initTestClient();

  await database.query(dropAllTables());

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const rawMigrationsFiles = await fs.readdir(migrationsPath);
  const migrationFiles = await extractMigrations(
    database,
    rawMigrationsFiles.map((file) => path.resolve(migrationsPath, file)),
  );

  const migration = buildMigration({
    database,
    migrationFiles,
  });

  await migration.up();
});

after(async () => {
  await app.shutdown.shutdown(false);
});
