import isMain from "is-main";
import openApiTs, { astToString, type OpenAPI3 } from "openapi-typescript";
import { z } from "zod";
import { startApp } from "../src/index.ts";
import { config } from "../src/infrastructure/config/config.ts";
import { switchGuard } from "../src/helpers/switch-guard.ts";
import { packageJson } from "../src/packageJson.ts";

export async function generateClient(format: "yaml" | "json" | "ts") {
	const { httpServer, appShutdown } = await startApp({
		config: {
			...config,
			logLevel: "fatal",
		},
		packageJson,
	});

	const openapi = httpServer.swagger() as OpenAPI3;
	const yaml = httpServer.swagger({ yaml: true });

	await appShutdown();

	let out: string;

	switch (format) {
		case "json": {
			out = JSON.stringify(openapi, null, 2);
			break;
		}
		case "yaml": {
			out = yaml;
			break;
		}
		case "ts": {
			const ast = await openApiTs(openapi);
			out = astToString(ast);
			break;
		}
		default:
			switchGuard(format, "format");
	}

	// biome-ignore lint/suspicious/noConsoleLog: script
	// biome-ignore lint/suspicious/noConsole: script
	console.log(out);
}

if (isMain(import.meta)) {
	const format = z
		.union([z.literal("yaml"), z.literal("json"), z.literal("ts")])
		.default("ts")
		.parse(process.argv[2]);

	await generateClient(format);
}
