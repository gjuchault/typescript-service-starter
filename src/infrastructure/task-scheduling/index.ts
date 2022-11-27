// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable unicorn/no-null */
import path from "node:path";
import { Job, JobsOptions, Queue, Worker, scriptLoader } from "bullmq";

import type { Config } from "../../config";
import type { Cache } from "../cache";
import { createLogger } from "../logger";
import type { Telemetry } from "../telemetry";
import { getSpanOptions } from "../telemetry/instrumentations/bullmq";

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
}

export function createTaskScheduling({
  config,
  cache,
  telemetry,
}: Dependencies): TaskScheduling {
  const allQueues: Queue[] = [];
  const allWorkers: Worker[] = [];

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

      const queue = new Queue(name, {
        connection: cache.duplicate({ maxRetriesPerRequest: null }),
      });

      await queue.waitUntilReady();

      allQueues.push(queue);

      for (let index = 0; index < workersCount; index += 1) {
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
          { connection: cache.duplicate({ maxRetriesPerRequest: null }) }
        );

        await worker.waitUntilReady();

        allWorkers.push(worker);

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
  };
}
