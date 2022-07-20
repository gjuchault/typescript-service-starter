#!/usr/bin/env node
import "dotenv/config";
import { createHealthcheckApplication } from "./application/healthcheck";
import { Config, getConfig, mergeConfig } from "./config";
import { createCacheStorage, Cache } from "./infrastructure/cache";
import { createDatabase, Database } from "./infrastructure/database";
import { createHttpServer, HttpServer } from "./infrastructure/http";
import { createLogger } from "./infrastructure/logger";
import { createShutdownManager } from "./infrastructure/shutdown";
import { createTelemetry } from "./infrastructure/telemetry";
import { bindHttpRoutes } from "./presentation/http";
import { createRepository } from "./repository";

export async function startApp(configOverride: Partial<Config> = {}) {
  mergeConfig(configOverride);

  const config = getConfig();
  const telemetry = await createTelemetry({ config });

  const logger = createLogger("app");

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

  try {
    cache = await createCacheStorage({
      url: config.redisUrl,
      telemetry,
    });

    database = await createDatabase({
      url: config.databaseUrl,
      telemetry,
    });

    httpServer = await createHttpServer({ config, cache, telemetry });
  } catch (error) {
    logger.error(`${config.name} startup error`, {
      error: (error as Record<string, unknown>).message ?? error,
    });
    process.exit(1);
  }

  const repository = createRepository({
    database,
  });

  const healthcheckApplication = createHealthcheckApplication({
    cache,
    healthcheckRepository: repository.healthcheck,
  });

  bindHttpRoutes({ httpServer, healthcheckApplication });

  const shutdown = createShutdownManager({
    logger,
    cache,
    database,
    httpServer,
    telemetry,
    config,
    exit: (statusCode?: number) => process.exit(statusCode),
  });

  shutdown.listenToProcessEvents();

  const listeningAbsoluteUrl = await httpServer.listen({
    host: config.address,
    port: config.port,
  });

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

// eslint-disable-next-line unicorn/prefer-module -- Not ESM yet
if (require.main === module) {
  // eslint-disable-next-line unicorn/prefer-top-level-await -- Not ESM yet
  startApp().catch((error) => {
    throw error;
  });
}
