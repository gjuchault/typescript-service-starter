import "dotenv/config";
import { createHealthcheckApplication } from "./application/healthcheck";
import { config, Config, mergeConfig } from "./config";
import { createCacheStorage } from "./infrastructure/cache";
import { createDatabase } from "./infrastructure/database";
import { createLogger } from "./infrastructure/logger";
import { createShutdownManager } from "./infrastructure/shutdown";
import { createTelemetry } from "./infrastructure/telemetry";
import { createHttpServer } from "./presentation/http";
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

  const { database, cache, httpServer } = await telemetry.startSpan(
    "app.startup",
    undefined,
    async () => {
      logger.info(`starting service ${config.name}...`, {
        version: config.version,
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
      });

      const cache = await createCacheStorage({
        url: config.redisUrl,
        telemetry,
      });

      const database = await createDatabase({
        url: config.databaseUrl,
        telemetry,
      });

      const httpServer = createHttpServer(config);

      const repository = createRepository({
        database,
      });

      const healthcheckApplication = createHealthcheckApplication({
        cache,
        healthcheckRepository: repository.healthcheck,
      });

      bindHealthcheckRoutes({ healthcheckApplication, httpServer });

      return {
        database,
        cache,
        httpServer,
      };
    }
  );

  const shutdown = createShutdownManager({
    logger,
    cache,
    database,
    httpServer,
    telemetry,
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
