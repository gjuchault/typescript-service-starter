import path from "node:path";
import fs from "node:fs/promises";
import url from "node:url";
import "dotenv/config";
import { createPool } from "slonik";
import launchEditor from "launch-editor";
import { z } from "zod";
import { config } from "../src/config";
import {
  buildMigration,
  extractMigrations,
} from "@gjuchault/typescript-service-sdk";
import { match } from "ts-pattern";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const migrationsPath = path.join(__dirname, "../migrations");

export async function migrate(args = process.argv.slice(2), exit = true) {
  const database = await createPool(config.databaseUrl);
  const rawMigrationsFiles = await fs.readdir(migrationsPath);
  const migrationFiles = await extractMigrations(
    database,
    rawMigrationsFiles.map((file) => path.resolve(migrationsPath, file))
  );
  const umzug = buildMigration({
    migrationFiles,
    database,
  });

  umzug.on("migrating", ({ name }) => {
    process.stdout.write(`🐘 migrating ${name}`);
  });

  umzug.on("migrated", () => {
    console.log(" ✅");
  });

  const command = z
    .union([z.literal("up"), z.literal("create")])
    .parse(args[0]);

  await match(command)
    .with("up", async () => await umzug.up())
    .with("create", async () => {
      const name = z.string().parse(args[1]);
      await create(name);
    })
    .exhaustive();

  if (exit) {
    process.exit(0);
  }
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

  const fileName = `${prefix}_${slug}.sql`;
  const filePath = path.join(migrationsPath, fileName);

  await fs.writeFile(filePath, `select 1;\n`);
  await launchEditor(filePath);
}

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    await migrate();
  }
}
