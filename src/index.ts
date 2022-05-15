import "dotenv/config";
import { createHealthcheckApplication } from "./application/healthcheck";
import * as config from "./config";
import { createCacheStorage } from "./infrastructure/cache";
import { createDatabase } from "./infrastructure/database";
import { logger } from "./infrastructure/logger";
import { createShutdownManager } from "./infrastructure/shutdown";
import { createTelemetry } from "./infrastructure/telemetry";
import { createHttpServer } from "./presentation/http";
import { bindHealthcheckRoutes } from "./presentation/http/routes/healthcheck";
import { createRepository } from "./repository";

export async function main() {
  const telemetry = await createTelemetry();

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

      const cache = await createCacheStorage({ telemetry });
      const database = await createDatabase({ telemetry });

      const httpServer = createHttpServer();

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

  createShutdownManager({
    logger,
    cache,
    database,
    httpServer,
    telemetry,
  });
}

main().catch((error) => {
  throw error;
});
