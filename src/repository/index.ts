import type { Database } from "../infrastructure/database/index.js";
import { createHealthcheckRepository } from "./healthcheck/index.js";

export function createRepository({ database }: { database: Database }) {
  return {
    healthcheck: createHealthcheckRepository({
      database,
    }),
  };
}
