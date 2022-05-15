import { sql, createPool, DatabasePool } from "slonik";
import * as config from "../../config";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import {
  getSpanOptions,
  buildSlonikTelemetryInterceptor,
} from "../telemetry/instrumentations/slonik";

interface Dependencies {
  telemetry: Telemetry;
}

export async function createDatabasePool({
  telemetry,
}: Dependencies): Promise<DatabasePool> {
  const logger = createLogger("database");

  const pool = createPool(config.databaseUrl, {
    captureStackTrace: false,
    interceptors: [buildSlonikTelemetryInterceptor({ telemetry })],
  });

  return telemetry.startSpan(
    "database.connect",
    getSpanOptions({ pool }),
    async () => {
      logger.debug(`Connecting to database...`);

      await pool.query(sql`select 1`);

      logger.info(`Connected to database`);

      return pool;
    }
  );
}
