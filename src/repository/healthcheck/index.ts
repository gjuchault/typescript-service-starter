import { DatabasePool, sql } from "slonik";
import { z } from "zod";

export interface HealthcheckRepository {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export type GetHealthcheckResult =
  | { outcome: "healthy" }
  | { outcome: "unhealthy" };

export function createHealthcheckRepository({
  database,
}: {
  database: DatabasePool;
}): HealthcheckRepository {
  async function getHealthcheck(): Promise<GetHealthcheckResult> {
    try {
      await database.query(sql.type(z.unknown())`select 1`);

      return {
        outcome: "healthy",
      };
    } catch {
      return {
        outcome: "unhealthy",
      };
    }
  }

  return { getHealthcheck };
}
