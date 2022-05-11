import "dotenv/config";
import { sql } from "slonik";
import x from "timers/promises";
import { startMetrics } from "./metrics";
import { logger } from "./logger";
import * as config from "./config";
import { createDatabasePool } from "./database";

export async function main() {
  const metrics = await startMetrics();

  const { database, httpServer } = await metrics.startSpan(
    "app.startup",
    undefined,
    async () => {
      logger.info(`starting service ${config.name}...`, {
        version: config.version,
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
      });

      const database = await createDatabasePool({ metrics });

      const httpServer = {};

      return {
        database,
        httpServer,
      };
    }
  );
}

main().catch((error) => {
  throw error;
});
