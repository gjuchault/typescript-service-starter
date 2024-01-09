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
  createDependencyStore,
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

import { dateProvider } from "./infrastructure/date";

export async function startApp() {
  const dependencyStore = createDependencyStore();

  const createLogger = createLoggerProvider({ config });
  dependencyStore.provide("logger", createLogger);

  const telemetry = createTelemetry({ config, dependencyStore });
  dependencyStore.provide("telemetry", telemetry);

  const logger = createLogger("app");

  const appStartedTimestamp = Date.now();
  logger.info(`starting service ${config.name}...`, {
    version: config.version,
    nodeVersion: process.version,
    arch: process.arch,
    platform: process.platform,
  });

  dependencyStore.provide("date", dateProvider);

  let database: Database;
  let cache: Cache;
  let httpServer: HttpServer;
  let taskScheduling: TaskScheduling;
  let listeningAbsoluteUrl: string;
  let shutdown: ShutdownManager;

  try {
    cache = await createCacheStorage({ config, dependencyStore });
    dependencyStore.provide("cache", cache);

    taskScheduling = createTaskScheduling({ config, dependencyStore });
    dependencyStore.provide("taskScheduling", taskScheduling);

    database = await createDatabase({ config, dependencyStore });
    dependencyStore.provide("database", database);

    const repository = createRepository({ database });
    dependencyStore.provide("repository", repository);

    const healthcheckApplication = await createHealthcheckApplication({
      dependencyStore,
    });
    dependencyStore.provide("healthcheckApplication", healthcheckApplication);

    const appRouter = createAppRouter({ dependencyStore });

    httpServer = await createHttpServer({
      config,
      dependencyStore,
      appRouter,
    });
    dependencyStore.provide("httpServer", httpServer);

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
