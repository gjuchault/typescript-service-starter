import { config } from "../infrastructure/config/config.ts";
import { createDatabase } from "../infrastructure/database/database.ts";
import { mockTelemetry } from "../infrastructure/telemetry/telemetry.ts";
import { packageJson } from "../packageJson.ts";

export async function* getDatabase(overrideDbName: string) {
	return yield* createDatabase({
		config: {
			...config,
			logLevel: "warn",
			databaseUrl: replaceDatabaseInUrl(config.databaseUrl, overrideDbName),
			databaseIdleTimeout: 500,
		},
		packageJson,
		telemetry: mockTelemetry,
	});
}

export function replaceDatabaseInUrl(
	databaseUrl: string,
	override: string,
): string {
	const url = new URL(databaseUrl);
	url.pathname = `/${override}`;
	return url.toString();
}
