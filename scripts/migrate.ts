import path from "node:path";
import fs from "node:fs/promises";
import url from "node:url";
import { isMain } from "is-main";
import launchEditor from "launch-editor";
import { z } from "zod";
import { config } from "../src/infrastructure/config/config.ts";
import { packageJson } from "../src/packageJson.ts";
import { switchGuard } from "../src/helpers/switch-guard.ts";
import { createDatabase } from "../src/infrastructure/database/database.ts";
import { getMigrator } from "../src/infrastructure/database/migrator.ts";

const migrationsPath = path.join(
	path.dirname(url.fileURLToPath(import.meta.url)),
	"../src/infrastructure/database/migrations",
);

export async function migrate(args = process.argv.slice(2)) {
	const database = await createDatabase({
		config: {
			...config,
			logLevel: "warn",
		},
		packageJson,
	});
	const migrator = await getMigrator({ database });

	migrator.on("migrating", ({ name }) => {
		process.stdout.write(`🐘 migrating ${name}`);
	});

	migrator.on("migrated", () => {
		// biome-ignore lint/suspicious/noConsoleLog: script
		// biome-ignore lint/suspicious/noConsole: script
		console.log(" ✅");
	});

	const command = z
		.union([z.literal("up"), z.literal("create")])
		.parse(args[0]);

	switch (command) {
		case "create": {
			const name = z.string().parse(args[1]);
			await create(name);
			break;
		}
		case "up": {
			await migrator.up();
			break;
		}
		default:
			throw switchGuard(command, "command");
	}

	await database.end();
}

async function create(name: string) {
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
		["export async function up() {}", "export async function down() {}"].join(
			"\n",
		),
	);
	await launchEditor(filePath);
}

if (isMain(import.meta)) {
	if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
		await migrate();
	}
}
