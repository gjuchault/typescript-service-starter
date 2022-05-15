import "dotenv/config";
import * as config from "./config";
import { createHttpServer } from "./presentation/http";
import { startTelemetry } from "./infrastructure/telemetry";
import { logger } from "./infrastructure/logger";
import { createCacheStorage } from "./infrastructure/cache";
import { createDatabasePool } from "./infrastructure/database";

export async function main() {
  const telemetry = await startTelemetry();

  const { database, cache, httpServer } = await telemetry.startSpan(
    "app.startup",
    undefined,
    async () => {
      logger.info(`Starting service ${config.name}...`, {
        version: config.version,
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
      });

      const cache = await createCacheStorage({ telemetry });
      const database = await createDatabasePool({ telemetry });

      const httpServer = createHttpServer();

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
