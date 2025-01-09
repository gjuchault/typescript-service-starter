import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { isMain } from "is-main";
import launchEditor from "launch-editor";
import type { Umzug } from "umzug";
import { z } from "zod";
import { switchGuard } from "../src/helpers/switch-guard.ts";
import { config } from "../src/infrastructure/config/config.ts";
import {
	type Database,
	createDatabase,
} from "../src/infrastructure/database/database.ts";
import { getMigrator } from "../src/infrastructure/database/migrator.ts";
import { mockTelemetry } from "../src/infrastructure/telemetry/telemetry.ts";
import { packageJson } from "../src/packageJson.ts";

const migrationsPath = path.join(
	path.dirname(url.fileURLToPath(import.meta.url)),
	"../src/infrastructure/database/migrations",
);

export async function create(name: string) {
	const now = new Date();
	const prefix = [
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		now.getHours(),
		now.getMinutes(),
		now.getSeconds(),
	].join("");

	const slug = name.replace(/^\s+|\s+_$/g, "-");

	const fileName = `${prefix}_${slug}.ts`;
	const filePath = path.join(migrationsPath, fileName);

	await fs.writeFile(
		filePath,
		[
			'import { type CommonQueryMethods, sql } from "slonik";',
			"",
			"export async function up(tx: CommonQueryMethods) {}",
			"export async function down(tx: CommonQueryMethods) {}",
		].join("\n"),
	);

	await fs.appendFile(
		path.join(migrationsPath, "index.ts"),
		[
			"",
			"// biome-ignore lint/performance/noBarrelFile: migrations",
			"// biome-ignore lint/performance/noReExportAll: migrations",
			`export * as ${name} from "./${fileName}";`,
		].join("\n"),
	);

	await launchEditor(filePath);
}

async function getInstances(): Promise<{
	migrator: Umzug<Record<never, never>>;
	database: Database;
}> {
	const database = await createDatabase({
		config: {
			...config,
			logLevel: "warn",
		},
		packageJson,
		telemetry: mockTelemetry,
	});
	const migrator = await getMigrator({ database });

	migrator.on("reverting", ({ name }) => {
		// biome-ignore lint/suspicious/noConsoleLog: script
		// biome-ignore lint/suspicious/noConsole: script
		console.log(`🐘 reverting ${name}`);
	});

	migrator.on("migrating", ({ name }) => {
		// biome-ignore lint/suspicious/noConsoleLog: script
		// biome-ignore lint/suspicious/noConsole: script
		console.log(`🐘 migrating ${name}`);
	});

	return { migrator, database };
}

export async function up() {
	const time = Date.now();
	const { database, migrator } = await getInstances();

	await migrator.up();
	await database.end();

	// biome-ignore lint/suspicious/noConsoleLog: script
	// biome-ignore lint/suspicious/noConsole: script
	console.log(`✅ up in ${Date.now() - time}ms`);
}

export async function down(step?: number) {
	const time = Date.now();
	const { database, migrator } = await getInstances();

	await migrator.down(step !== undefined ? { step } : undefined);
	await database.end();

	// biome-ignore lint/suspicious/noConsoleLog: script
	// biome-ignore lint/suspicious/noConsole: script
	console.log(`✅ down in ${Date.now() - time}ms`);
}

if (isMain(import.meta)) {
	const command = z
		.union([z.literal("up"), z.literal("down"), z.literal("create")])
		.parse(process.argv.at(2));

	switch (command) {
		case "create": {
			const nameResult = z.string().safeParse(process.argv.at(3));

			if (nameResult.success === false) {
				// biome-ignore lint/suspicious/noConsoleLog: script
				// biome-ignore lint/suspicious/noConsole: script
				console.log("usage: node --run migrate:create -- <name>");
				process.exit(1);
			}

			await create(nameResult.data);
			break;
		}
		case "up": {
			await up();
			break;
		}
		case "down": {
			const step = z.coerce
				.number()
				.safe()
				.int()
				.optional()
				.parse(process.argv.at(3));
			await down(step);
			break;
		}
		default:
			throw switchGuard(command, "command");
	}
}
