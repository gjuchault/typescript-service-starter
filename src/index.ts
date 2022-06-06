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

export async function main(
  {
    configOverride,
  }: {
    configOverride: Partial<Config>;
  } = { configOverride: {} }
) {
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

    httpServer = createHttpServer({ config, cache });
  } catch (error) {
    logger.error(`${config.name} startup error`, {
      error: (error as unknown as Record<string, unknown>)?.message ?? error,
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
  });

  const listeningAbsoluteUrl = await httpServer.listen(
    config.port,
    config.address
  );

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

if (require.main === module) {
  main().catch((error) => {
    throw error;
  });
}
