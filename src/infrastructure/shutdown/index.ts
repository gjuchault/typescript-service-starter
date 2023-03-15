import { context, trace } from "@opentelemetry/api";
import { createHttpTerminator } from "http-terminator";
import ms from "ms";
import type { Config } from "../../config.js";
import type { HttpServer } from "../../infrastructure/http/index.js";
import type { Cache } from "../cache/index.js";
import type { Database } from "../database/index.js";
import { promiseWithTimeout } from "../helpers/promise-timeout.js";
import type { Logger } from "../logger/index.js";
import type { TaskScheduling } from "../task-scheduling/index.js";
import type { Telemetry } from "../telemetry/index.js";

interface Dependencies {
  logger: Logger;
  httpServer: HttpServer;
  database: Database;
  taskScheduling: TaskScheduling;
  cache: Cache;
  telemetry: Telemetry;
  config: Config;
  exit: (statusCode: number) => void;
}

export interface ShutdownManager {
  listenToProcessEvents: () => void;
  shutdown: (shouldExit?: boolean) => Promise<void>;
}

export function createShutdownManager({
  logger,
  httpServer,
  database,
  taskScheduling,
  cache,
  telemetry,
  config,
  exit,
}: Dependencies) {
  const httpTerminator = createHttpTerminator({
    server: httpServer.server,
    gracefulTerminationTimeout: ms("10s"),
  });

  let isShuttingDown = false;

  async function shutdown(shouldExit = true) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    logger.info("received termination event, shutting down...");

    const gracefulShutdownTimeout = "20s";

    async function gracefulShutdown() {
      await Promise.all(taskScheduling.allQueues.map((queue) => queue.close()));
      await Promise.all(
        taskScheduling.allWorkers.map((worker) => worker.close())
      );
      await Promise.all(
        taskScheduling.allConnections.map((cache) => cache.quit())
      );
      logger.debug("task scheduling shut down");
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
    } catch {
      success = false;
    }

    if (success) {
      logger.info(`gracefully shut down service ${config.name}`, {
        version: config.version,
        nodeVersion: process.version,
        arch: process.arch,
        platform: process.platform,
      });
    } else {
      logger.fatal(
        `could not gracefully shut down service ${config.name} after ${gracefulShutdownTimeout}`,
        {
          version: config.version,
          nodeVersion: process.version,
          arch: process.arch,
          platform: process.platform,
        }
      );

      if (shouldExit) {
        return exit(1);
      }
    }

    logger.flush();

    if (shouldExit) {
      return exit(0);
    }
  }

  function listenToProcessEvents() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.addListener("SIGTERM", async () => {
      await shutdown();
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.addListener("SIGINT", async () => {
      await shutdown();
    });
  }

  return { listenToProcessEvents, shutdown };
}
