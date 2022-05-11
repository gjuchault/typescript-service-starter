import { sql, createPool, DatabasePool } from "slonik";
import * as config from "./config";
import { createLogger } from "./logger";
import type { Metrics } from "./metrics";
import {
  getSpanOptions,
  buildSlonikMetricsInterceptor,
} from "./metrics/instrumentations/slonik";

interface Dependencies {
  metrics: Metrics;
}

export async function createDatabasePool({
  metrics,
}: Dependencies): Promise<DatabasePool> {
  const logger = createLogger("database");

  const pool = createPool(config.databaseUrl, {
    captureStackTrace: false,
    interceptors: [buildSlonikMetricsInterceptor({ metrics })],
  });

  return metrics.startSpan(
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
