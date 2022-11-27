import { SpanKind } from "@opentelemetry/api";
import {
  DbSystemValues,
  SemanticAttributes,
} from "@opentelemetry/semantic-conventions";
import type { Job, Worker } from "bullmq";

const bullMqAttributes = {
  JOB_ATTEMPTS: `messaging.bullmq.job.attempts`,
  JOB_DELAY: `messaging.bullmq.job.delay`,
  JOB_NAME: `messaging.bullmq.job.name`,
  JOB_TIMESTAMP: `messaging.bullmq.job.timestamp`,
  QUEUE_NAME: `messaging.bullmq.queue.name`,
  WORKER_NAME: `messaging.bullmq.worker.name`,
};

export function getSpanOptions({
  worker,
  job,
  taskName,
  url,
}: {
  worker: Worker;
  job: Job;
  taskName: string;
  url: string;
}) {
  return {
    kind: SpanKind.CLIENT,
    attributes: {
      ...getCommonSpanOptions(url),
      [SemanticAttributes.MESSAGING_CONSUMER_ID]: taskName,
      [SemanticAttributes.MESSAGING_MESSAGE_ID]: job.id ?? "unknown",
      [SemanticAttributes.MESSAGING_OPERATION]: "receive",
      [bullMqAttributes.JOB_NAME]: job.name,
      [bullMqAttributes.JOB_ATTEMPTS]: job.attemptsMade,
      [bullMqAttributes.JOB_TIMESTAMP]: job.timestamp,
      [bullMqAttributes.JOB_DELAY]: job.delay,
      [bullMqAttributes.QUEUE_NAME]: job.queueName,
      [bullMqAttributes.WORKER_NAME]: worker.name,
    },
  };
}

export function getCommonSpanOptions(url: string) {
  const redisUrl = new URL(url);
  redisUrl.password = "";

  return {
    [SemanticAttributes.DB_SYSTEM]: DbSystemValues.REDIS,
    [SemanticAttributes.DB_NAME]:
      redisUrl.pathname.slice(1) === "" ? "0" : redisUrl.pathname.slice(1),
    [SemanticAttributes.NET_PEER_NAME]: redisUrl.host,
    [SemanticAttributes.NET_PEER_PORT]: redisUrl.port,
    [SemanticAttributes.DB_CONNECTION_STRING]: `redis://${redisUrl.host}:${redisUrl.port}`,
    [SemanticAttributes.DB_USER]: redisUrl.username,
    [SemanticAttributes.MESSAGING_SYSTEM]: "bullmq",
  };
}
