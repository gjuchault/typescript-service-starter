import type { Database } from "@gjuchault/typescript-service-sdk";
import { createHealthcheckRepository } from "./healthcheck/index.js";

export function createRepository({ database }: { database: Database }) {
  return {
    healthcheck: createHealthcheckRepository({
      database,
    }),
  };
}
