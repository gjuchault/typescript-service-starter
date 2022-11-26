import { sql, createPool, DatabasePool } from "slonik";
import { z } from "zod";
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

  const {
    databaseIdleTimeout: idleTimeout,
    databaseStatementTimeout: statementTimeout,
    databaseMaximumPoolSize: maximumPoolSize,
    databaseUrl: url,
  } = config;

  return await telemetry.startSpan(
    "database.connect",
    getSpanOptions({ idleTimeout, maximumPoolSize }),
    async () => {
      logger.debug(`connecting to database...`);

      const pool = await createPool(url, {
        captureStackTrace: false,
        statementTimeout,
        interceptors: [createSlonikTelemetryInterceptor({ telemetry })],
        idleTimeout,
        maximumPoolSize,
      });

      await pool.query(sql.type(z.unknown())`select 1`);

      logger.info(`connected to database`);

      return pool;
    }
  );
}
