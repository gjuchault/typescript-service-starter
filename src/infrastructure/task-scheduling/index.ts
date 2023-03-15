// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable unicorn/no-null */
import path from "node:path";
import url from "node:url";
import { Job, JobsOptions, Queue, Worker, scriptLoader } from "bullmq";

import type { Config } from "../../config.js";
import type { Cache } from "../cache/index.js";
import { createLogger } from "../logger/index.js";
import type { Telemetry } from "../telemetry/index.js";
import { getSpanOptions } from "../telemetry/instrumentations/bullmq.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

interface Dependencies {
  config: Config;
  cache: Cache;
  telemetry: Telemetry;
}

export interface TaskScheduling {
  createTask<TPayload>(
    taskName: string,
    processFunction: (job: Job<TPayload>) => Promise<void>,
    workersCount?: number
  ): Promise<(payloads: TPayload[], options?: JobsOptions) => Promise<void>>;
  allWorkers: Worker[];
  allQueues: Queue[];
  allConnections: Cache[];
}

export function createTaskScheduling({
  config,
  cache,
  telemetry,
}: Dependencies): TaskScheduling {
  const allQueues: Queue[] = [];
  const allWorkers: Worker[] = [];
  const allConnections: Cache[] = [];

  // prevent bullmq from reading from node_modules that might not exist if we
  // bundle the files
  scriptLoader.load = async (client: Cache) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const scripts = await scriptLoader.loadScripts(
      path.join(__dirname, "./bullmq-commands")
    );
    for (const command of scripts) {
      if (!(client as unknown as Record<string, unknown>)[command.name]) {
        client.defineCommand(command.name, command.options);
      }
    }
  };

  return {
    async createTask<TPayload>(
      taskName: string,
      processFunction: (job: Job<TPayload>) => Promise<void>,
      workersCount = 1
    ) {
      const name = `${config.name}-task-scheduling-${taskName}`;
      const logger = createLogger(`task-scheduling-${taskName}`, { config });

      const queueConnection = cache.duplicate({ maxRetriesPerRequest: null });
      const queue = new Queue(name, {
        connection: queueConnection,
      });

      await queue.waitUntilReady();

      allQueues.push(queue);
      allConnections.push(queueConnection);

      for (let index = 0; index < workersCount; index += 1) {
        const workerConnection = cache.duplicate({
          maxRetriesPerRequest: null,
        });
        const worker = new Worker<TPayload>(
          name,
          async (job) => {
            await telemetry.startSpan(
              "taskScheduling.worker",
              getSpanOptions({
                worker,
                job,
                taskName,
                url: config.redisUrl,
              }),
              () => processFunction(job)
            );
          },
          { connection: workerConnection }
        );

        await worker.waitUntilReady();

        allWorkers.push(worker);
        allConnections.push(workerConnection);

        worker.on("active", (job) => {
          logger.debug(`Worker ${worker.id} taking ${taskName}`, {
            ...job.toJSON(),
          });
        });

        worker.on("failed", (job, error) => {
          logger.debug(`Worker ${worker.id} failed ${taskName}`, {
            error,
            ...(job === undefined ? {} : job.toJSON()),
          });
        });

        worker.on("completed", (job) => {
          logger.debug(`Worker ${worker.id} completed ${taskName}`, {
            ...job.toJSON(),
          });
        });
      }

      return async function enqueue(
        payloads: TPayload[],
        options?: JobsOptions
      ) {
        logger.debug(`enqueuing ${taskName}`, {
          payloads,
          options,
        });

        await queue.addBulk(
          payloads.map((data) => ({ name, data, opts: options }))
        );
      };
    },

    allWorkers,
    allQueues,
    allConnections,
  };
}
