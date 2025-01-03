import path from "node:path";
import process from "node:process";
import { build as esbuild } from "esbuild";
import { isMain } from "is-main";

async function bundle() {
	await esbuild({
		platform: "node",
		target: "node23",
		format: "esm",
		sourcemap: true,
		external: ["pg-native"],
		bundle: true,
		outdir: path.join(process.cwd(), "./build"),
		banner: {
			js: [
				"import { createRequire } from 'node:module';",
				"const require = createRequire(import.meta.url);",
				"const __dirname = import.meta.dirname;",
			].join("\n"),
		},
		splitting: true,
		entryPoints: [
			path.join(process.cwd(), "./src/index.ts"),
			path.join(process.cwd(), "./src/worker.ts"),
		],
	});
}

if (isMain(import.meta)) {
	await bundle();
}
