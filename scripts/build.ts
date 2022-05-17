import path from "node:path";
import { build as esbuild } from "esbuild";

async function main() {
  await esbuild({
    platform: "node",
    target: "esnext",
    format: "cjs",
    nodePaths: [path.join(__dirname, "../src")],
    sourcemap: true,
    external: ["pg-native"],
    bundle: true,
    outdir: path.join(__dirname, "../build"),
    entryPoints: [path.join(__dirname, "../src/index.ts")],
  });
}

if (require.main === module) {
  main();
}
