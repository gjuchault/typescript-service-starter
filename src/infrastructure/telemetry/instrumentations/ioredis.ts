import type { Redis } from "ioredis";
import { SpanKind, Span } from "@opentelemetry/api";
import {
  DbSystemValues,
  SemanticAttributes,
} from "@opentelemetry/semantic-conventions";
import type { Telemetry } from "..";
import * as config from "../../../config";

export function getSpanOptions({ redis }: { redis: Redis }) {
  return {
    kind: SpanKind.CLIENT,
    attributes: {
      ...getCommonSpanOptions(),
    },
  };
}

export function getCommonSpanOptions() {
  const redisUrl = new URL(config.redisUrl);
  redisUrl.password = "";

  return {
    [SemanticAttributes.DB_SYSTEM]: DbSystemValues.REDIS,
    [SemanticAttributes.DB_NAME]: redisUrl.pathname.slice(1) ?? "0",
    [SemanticAttributes.NET_PEER_NAME]: redisUrl.host,
    [SemanticAttributes.NET_PEER_PORT]: redisUrl.port,
    [SemanticAttributes.DB_CONNECTION_STRING]: `redis://${redisUrl.host}:${redisUrl.port}`,
    [SemanticAttributes.DB_USER]: redisUrl.username,
  };
}
