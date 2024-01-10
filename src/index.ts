#!/usr/bin/env node
import process from "node:process";
import url from "node:url";

import type {
  Cache,
  Database,
  HttpServer,
  ShutdownManager,
  TaskScheduling,
} from "@gjuchault/typescript-service-sdk";
import {
  createCacheStorage,
  createDatabase,
  createDateProvider,
  createHttpServer,
  createLoggerProvider,
  createShutdownManager,
  createTaskScheduling,
  createTelemetry,
} from "@gjuchault/typescript-service-sdk";

import { createHealthcheckApplication } from "~/application/healthcheck/index.js";
import { config } from "~/config.js";
import { createAppRouter } from "~/presentation/http/index.js";
import { createRepository } from "~/repository/index.js";

import { dependencyStore } from "./store";

export async function startApp() {
  const createLogger = createLoggerProvider({ config });
  const logger = createLogger("app");

  dependencyStore.set("logger", createLogger);

  const telemetry = createTelemetry({ config, dependencyStore });
  dependencyStore.set("telemetry", telemetry);

  const appStartedTimestamp = Date.now();
  logger.info(`starting service ${config.name}...`, {
    version: config.version,
    nodeVersion: process.version,
    arch: process.arch,
    platform: process.platform,
  });

  dependencyStore.set("date", createDateProvider());

  let database: Database;
  let cache: Cache;
  let httpServer: HttpServer;
  let taskScheduling: TaskScheduling;
  let listeningAbsoluteUrl: string;
  let shutdown: ShutdownManager;

  try {
    cache = await createCacheStorage({ config, dependencyStore });
    dependencyStore.set("cache", cache);

    taskScheduling = createTaskScheduling({ config, dependencyStore });
    dependencyStore.set("taskScheduling", taskScheduling);

    database = await createDatabase({ config, dependencyStore });
    dependencyStore.set("database", database);

    const repository = createRepository({ dependencyStore });
    dependencyStore.set("repository", repository);

    const healthcheckApplication = await createHealthcheckApplication({
      dependencyStore,
    });
    dependencyStore.set("healthcheckApplication", healthcheckApplication);

    const appRouter = createAppRouter({ dependencyStore });

    httpServer = await createHttpServer({
      config,
      dependencyStore,
      appRouter,
    });
    dependencyStore.set("httpServer", httpServer);

    shutdown = createShutdownManager({
      config,
      dependencyStore,
      exit: (statusCode?: number) => process.exit(statusCode),
    });

    shutdown.listenToProcessEvents();

    listeningAbsoluteUrl = await httpServer.listen({
      host: config.address,
      port: config.port,
    });
  } catch (error) {
    logger.error(`${config.name} startup error`, {
      error: (error as Record<string, unknown>).message ?? error,
    });
    process.exit(1);
  }

  logger.info(`${config.name} server listening on ${listeningAbsoluteUrl}`, {
    version: config.version,
    nodeVersion: process.version,
    arch: process.arch,
    platform: process.platform,
    startupTime: Date.now() - appStartedTimestamp,
  });

  return {
    httpServer,
    database,
    cache,
    shutdown,
  };
}

if (
  import.meta.url.startsWith("file:") &&
  process.argv[1] === url.fileURLToPath(import.meta.url)
) {
  await startApp();
}
