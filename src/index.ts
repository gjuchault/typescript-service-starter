#!/usr/bin/env node
import url from "node:url";
import { createHealthcheckApplication } from "./application/healthcheck/index.js";
import { Config, getConfig } from "./config.js";
import { createCacheStorage, Cache } from "./infrastructure/cache/index.js";
import { createDatabase, Database } from "./infrastructure/database/index.js";
import { createHttpServer, HttpServer } from "./infrastructure/http/index.js";
import { createLogger } from "./infrastructure/logger/index.js";
import {
  createShutdownManager,
  ShutdownManager,
} from "./infrastructure/shutdown/index.js";
import {
  createTaskScheduling,
  TaskScheduling,
} from "./infrastructure/task-scheduling/index.js";
import { createTelemetry } from "./infrastructure/telemetry/index.js";
import { createAppRouter } from "./presentation/http/index.js";
import { createRepository } from "./repository/index.js";

export type { AppRouter } from "./presentation/http/index.js";

export async function startApp(configOverride: Partial<Config> = {}) {
  const config = getConfig(configOverride);
  const telemetry = await createTelemetry({ config });

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

console.log(
  import.meta.url.startsWith("file:"),
  process.argv[1],
  url.fileURLToPath(import.meta.url),
  process.argv[1] === url.fileURLToPath(import.meta.url)
);
if (
  import.meta.url.startsWith("file:") &&
  process.argv[1] === url.fileURLToPath(import.meta.url)
) {
  await startApp();
}
