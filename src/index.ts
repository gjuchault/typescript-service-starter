#!/usr/bin/env node
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
  createHttpServer,
  createLogger,
  createShutdownManager,
  createTaskScheduling,
  createTelemetry,
} from "@gjuchault/typescript-service-sdk";

import { createHealthcheckApplication } from "~/application/healthcheck/index.js";
import { config } from "~/config.js";
import { createAppRouter } from "~/presentation/http/index.js";
import { createRepository } from "~/repository/index.js";

export async function startApp() {
  const telemetry = createTelemetry({ config });

  const logger = createLogger("app", { config });

  const appStartedTimestamp = Date.now();
  logger.info(`starting service ${config.name}...`, {
    version: config.version,
    nodeVersion: process.version,
    arch: process.arch,
    platform: process.platform,
  });

  let database: Database;
  let cache: Cache;
  let httpServer: HttpServer;
  let taskScheduling: TaskScheduling;
  let listeningAbsoluteUrl: string;
  let shutdown: ShutdownManager;

  try {
    cache = await createCacheStorage({
      config,
      telemetry,
    });

    taskScheduling = createTaskScheduling({ config, cache, telemetry });

    database = await createDatabase({
      config,
      telemetry,
    });

    const repository = createRepository({
      database,
    });

    const healthcheckApplication = await createHealthcheckApplication({
      cache,
      taskScheduling,
      healthcheckRepository: repository.healthcheck,
    });

    const appRouter = createAppRouter({ healthcheckApplication });

    httpServer = await createHttpServer({
      config,
      cache,
      telemetry,
      appRouter,
    });

    shutdown = createShutdownManager({
      logger,
      cache,
      database,
      httpServer,
      taskScheduling,
      telemetry,
      config,
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
