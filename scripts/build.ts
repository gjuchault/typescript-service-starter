import path from "path";
import { build as esbuild } from "esbuild";

const baseConfig = {
  platform: "node" as const,
  target: "esnext" as const,
  format: "cjs" as const,
  nodePaths: [path.join(__dirname, "../src")],
  sourcemap: true,
  external: ["pg-native"],
};

async function main() {
  await esbuild({
    ...baseConfig,
    format: "cjs",
    bundle: true,
    outdir: path.join(__dirname, "../build"),
    entryPoints: [path.join(__dirname, "../src/index.ts")],
  });
}

if (require.main === module) {
  main();
}
