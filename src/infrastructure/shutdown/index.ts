import { setTimeout } from "node:timers/promises";
import { context, trace } from "@opentelemetry/api";
import { createHttpTerminator } from "http-terminator";
import ms from "ms";
import type { Config } from "../../config";
import { promiseWithTimeout } from "../../helpers/promise-timeout";
import type { HttpServer } from "../../infrastructure/http";
import type { Cache } from "../cache";
import type { Database } from "../database";
import type { Logger } from "../logger";
import type { Telemetry } from "../telemetry";

interface Dependencies {
  logger: Logger;
  httpServer: HttpServer;
  database: Database;
  cache: Cache;
  telemetry: Telemetry;
  config: Config;
}

export function createShutdownManager({
  logger,
  httpServer,
  database,
  cache,
  telemetry,
  config,
}: Dependencies) {
  const httpTerminator = createHttpTerminator({
    server: httpServer.server,
    gracefulTerminationTimeout: ms("10s"),
  });

  let isShuttingDown = false;

  async function shutdown(exit = true) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    logger.info("received termination event, shutting down...");

    const gracefulShutdownTimeout = "20s";

    async function gracefulShutdown() {
      await httpTerminator.terminate();
      logger.debug("http server shut down");
      await database.end();
      logger.debug("database shut down");
      await cache.quit();
      logger.debug("cache shut down");
      await telemetry.shutdown();
      context.disable();
      trace.disable();
      logger.debug("telemetry shut down");

      return true;
    }

    let success = true;
    try {
      await promiseWithTimeout(ms(gracefulShutdownTimeout), gracefulShutdown);
    } catch (err) {
      success = false;
    }

    if (!success) {
      logger.fatal(
        `could not gracefully shut down service ${config.name} after ${gracefulShutdownTimeout}`,
        {
          version: config.version,
          nodeVersion: process.version,
          arch: process.arch,
          platform: process.platform,
        }
      );

      if (exit) {
        process.exit(1);
      }
    } else {
      logger.info(`gracefully shut down service ${config.name}`, {
        version: config.version,
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
      });
    }

    logger.flush();

    if (exit) {
      await setTimeout(ms("1s"));
      process.exit(0);
    }
  }

  process.addListener("SIGTERM", async () => shutdown());
  process.addListener("SIGINT", async () => shutdown());

  return shutdown;
}
