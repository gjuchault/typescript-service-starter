import "dotenv/config";
import * as config from "./config";
import { createHttpServer } from "./presentation/http";
import { createTelemetry } from "./infrastructure/telemetry";
import { logger } from "./infrastructure/logger";
import { createCacheStorage } from "./infrastructure/cache";
import { createDatabase } from "./infrastructure/database";
import { createHealthcheckApplication } from "./application/healthcheck";
import { createRepository } from "./repository";
import { bindHealthcheckRoutes } from "./presentation/http/routes/healthcheck";

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
}

main().catch((error) => {
  throw error;
});
