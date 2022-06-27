import path from "node:path";
import fs from "node:fs/promises";
import "dotenv/config";
import { createPool, sql, TaggedTemplateLiteralInvocation } from "slonik";
import launchEditor from "launch-editor";
import { Umzug } from "umzug";
import { z } from "zod";
import { getConfig } from "../src/config";

const migrationsPath = path.join(__dirname, "../migrations");
export const databasePool = createPool(getConfig().databaseUrl);

export async function migrate(args = process.argv.slice(2), exit = true) {
  const umzug = new Umzug({
    migrations: await readMigrations(),
    logger: undefined,
    storage: {
      executed,
      logMigration,
      unlogMigration,
    },
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

  switch (command) {
    case "up":
      await umzug.up();
      break;
    case "create":
      const name = z.string().parse(args[1]);
      await create(name);
      break;
  }

  if (exit) {
    process.exit(0);
  }
}

async function ensureTable() {
  await databasePool.query(sql`
    create table if not exists "public"."migrations" (
      "name" varchar, primary key ("name")
    );
  `);
}

async function executed() {
  await ensureTable();
  const migrations = await databasePool.anyFirst<string>(sql`
    select "name"
    from "public"."migrations"
    order by "name" asc;
  `);

  return migrations.slice();
}

async function logMigration({ name }: { name: string }) {
  await databasePool.query(sql`
    insert into "public"."migrations" ("name")
    values (${name});
  `);
}

async function unlogMigration({ name }: { name: string }) {
  await ensureTable();

  await databasePool.query(sql`
    delete from "public"."migrations"
    where "name" = ${name};
  `);
}

async function readMigrations() {
  const migrationsFiles = await fs.readdir(migrationsPath);
  return await Promise.all(
    migrationsFiles
      .filter((file) => file.endsWith(".sql"))
      .map(async (file) => {
        const content = await fs.readFile(
          path.join(migrationsPath, file),
          "utf8"
        );

        const query: TaggedTemplateLiteralInvocation = {
          sql: content,
          type: "SLONIK_TOKEN_SQL",
          values: [],
        };

        return {
          name: file.slice(file.indexOf("_") + 1, -1 * ".sql".length),
          async up() {
            await databasePool.query(query);
          },
          async down() {},
        };
      })
  );
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

if (require.main === module) {
  migrate();
}
