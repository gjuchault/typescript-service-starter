import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import isMain from "is-main";
import openApiTs, { astToString, type OpenAPI3 } from "openapi-typescript";
import { startApp } from "../src/index.ts";
import { config } from "../src/infrastructure/config/config.ts";
import { packageJson } from "../src/packageJson.ts";

export async function generateClient(): Promise<void> {
	const { httpServer, appShutdown } = await startApp({
		config: {
			...config,
			logLevel: "debug",
		},
		packageJson,
	});

	const openapi = httpServer.swagger() as OpenAPI3;
	const yaml = httpServer.swagger({ yaml: true });
	const ast = await openApiTs(openapi);
	const ts = astToString(ast);

	await appShutdown();

	await fs.rm(path.join(process.cwd(), "client"), {
		recursive: true,
		force: true,
	});
	await fs.mkdir(path.join(process.cwd(), "client"), { recursive: true });
	await Promise.all([
		fs.writeFile(
			path.join(process.cwd(), "client/openapi.json"),
			JSON.stringify(openapi, null, 2),
		),
		fs.writeFile(path.join(process.cwd(), "client/openapi.yaml"), yaml),
		fs.writeFile(path.join(process.cwd(), "client/schema.d.ts"), ts),
	]);
}

if (isMain(import.meta)) {
	await generateClient();
}
