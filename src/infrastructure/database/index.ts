import ms from "ms";
import { sql, createPool, DatabasePool } from "slonik";
import type { Config } from "../../config";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import {
  getSpanOptions,
  createSlonikTelemetryInterceptor,
} from "../telemetry/instrumentations/slonik";

interface Dependencies {
  config: Config;
  telemetry: Telemetry;
}

export type Database = DatabasePool;

export async function createDatabase({
  config,
  telemetry,
}: Dependencies): Promise<Database> {
  const logger = createLogger("database", { config });

  const idleTimeout = ms("5s");
  const maximumPoolSize = 10;

  return await telemetry.startSpan(
    "database.connect",
    getSpanOptions({ idleTimeout, maximumPoolSize }),
    async () => {
      logger.debug(`connecting to database...`);

      const pool = await createPool(config.databaseUrl, {
        captureStackTrace: false,
        statementTimeout: ms("20s"),
        interceptors: [createSlonikTelemetryInterceptor({ telemetry })],
        idleTimeout,
        maximumPoolSize,
      });

      await pool.query(sql`select 1`);

      logger.info(`connected to database`);

      return pool;
    }
  );
}
