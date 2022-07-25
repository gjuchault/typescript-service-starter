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

  const pool = createPool(config.databaseUrl, {
    captureStackTrace: false,
    statementTimeout: ms("20s"),
    interceptors: [createSlonikTelemetryInterceptor({ telemetry })],
  });

  return telemetry.startSpan(
    "database.connect",
    getSpanOptions({ pool }),
    async () => {
      logger.debug(`connecting to database...`);

      await pool.query(sql`select 1`);

      logger.info(`connected to database`);

      return pool;
    }
  );
}
