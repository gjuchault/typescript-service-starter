import path from "node:path";
import fs from "node:fs/promises";
import { build as esbuild, BuildOptions } from "esbuild";

export async function build(opts: Partial<BuildOptions> = {}) {
  const result = await esbuild({
    platform: "node",
    target: "esnext",
    format: "cjs",
    nodePaths: [path.join(__dirname, "../src")],
    sourcemap: true,
    external: ["pg-native"],
    bundle: true,
    outdir: path.join(__dirname, "../build"),
    entryPoints: [path.join(__dirname, "../src/index.ts")],
    ...opts,
  });

  await copyLuaCommands();

  return result;
}

// prevent bullmq from reading from node_modules that might not exist if we
// bundle the files
async function copyLuaCommands() {
  const source = path.join(
    __dirname,
    "../node_modules/bullmq/dist/cjs/commands"
  );
  const target = path.join(__dirname, "../build/bullmq-commands");

  await fs.mkdir(path.join(target, "includes"), { recursive: true });

  for (const file of await fs.readdir(source)) {
    if (file.endsWith(".lua")) {
      await fs.copyFile(path.join(source, file), path.join(target, file));
    }
  }

  for (const file of await fs.readdir(path.join(source, "includes"))) {
    if (file.endsWith(".lua")) {
      await fs.copyFile(
        path.join(source, "includes", file),
        path.join(target, "includes", file)
      );
    }
  }
}

if (require.main === module) {
  build();
}
