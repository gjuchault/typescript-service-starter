import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build as esbuild } from "esbuild";
import { isMain } from "is-main";

async function bundle() {
	const startTime = Date.now();

	await fs.rm(path.join(process.cwd(), "./build"), {
		recursive: true,
		force: true,
	});

	await esbuild({
		platform: "node",
		target: "node23",
		format: "esm",
		sourcemap: true,
		external: ["pg-native", "@valkey/valkey-glide"],
		bundle: true,
		banner: {
			js: [
				"import { createRequire } from 'node:module';",
				"const require = createRequire(import.meta.url);",
				"const __dirname = import.meta.dirname;",
			].join("\n"),
		},
		splitting: true,
		outdir: path.join(process.cwd(), "./build"),
		entryPoints: {
			index: path.join(process.cwd(), "./src/index.ts"),
			worker: path.join(process.cwd(), "./src/worker.ts"),
			migrate: path.join(process.cwd(), "./scripts/migrate.ts"),
		},
	});

	console.log(`📦 bundled in ${Date.now() - startTime}ms`);
}

if (isMain(import.meta)) {
	await bundle();
}
