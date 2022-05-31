import "dotenv/config";
import { createHealthcheckApplication } from "./application/healthcheck";
import { config, Config, mergeConfig } from "./config";
import { createCacheStorage, Cache } from "./infrastructure/cache";
import { createDatabase, Database } from "./infrastructure/database";
import { createLogger } from "./infrastructure/logger";
import { createShutdownManager } from "./infrastructure/shutdown";
import { createTelemetry } from "./infrastructure/telemetry";
import { createHttpServer, HttpServer } from "./presentation/http";
import { bindHealthcheckRoutes } from "./presentation/http/routes/healthcheck";
import { createRepository } from "./repository";

export async function main(
  {
    configOverride,
  }: {
    configOverride: Partial<Config>;
  } = { configOverride: {} }
) {
  const telemetry = await createTelemetry();

  mergeConfig(configOverride);

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

    httpServer = createHttpServer(config);
  } catch (error) {
    logger.error(`${config.name} startup error`, { error });
    process.exit(1);
  }

  const repository = createRepository({
    database,
  });

  const healthcheckApplication = createHealthcheckApplication({
    cache,
    healthcheckRepository: repository.healthcheck,
  });

  bindHealthcheckRoutes({ healthcheckApplication, httpServer });

  const shutdown = createShutdownManager({
    logger,
    cache,
    database,
    httpServer,
    telemetry,
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
