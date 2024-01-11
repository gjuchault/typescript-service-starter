import { err, ok, Result } from "neverthrow";
import { sql } from "slonik";
import { z } from "zod";

import { DependencyStore } from "~/store";

export interface HealthcheckRepository {
  getHealthcheck(_: {
    dependencyStore: DependencyStore;
  }): Promise<GetHealthcheckResult>;
}

export type GetHealthcheckResult = Result<"healthy", "databaseError">;

export async function getHealthcheck({
  dependencyStore,
}: {
  dependencyStore: DependencyStore;
}): Promise<GetHealthcheckResult> {
  const database = dependencyStore.get("database");

  try {
    await database.query(sql.type(z.unknown())`select 1`);

    return ok("healthy");
  } catch {
    return err("databaseError");
  }
}
