import { err, ok, Result } from "neverthrow";
import { sql } from "slonik";
import { z } from "zod";

import { DependencyStore } from "~/store";

export interface HealthcheckRepository {
  getHealthcheck(): Promise<GetHealthcheckResult>;
}

export type GetHealthcheckResult = Result<"healthy", "databaseError">;

export function createHealthcheckRepository({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): HealthcheckRepository {
  async function getHealthcheck(): Promise<GetHealthcheckResult> {
    const database = dependencyStore.get("database");

    try {
      await database.query(sql.type(z.unknown())`select 1`);

      return ok("healthy");
    } catch {
      return err("databaseError");
    }
  }

  return { getHealthcheck };
}
