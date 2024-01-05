import path from "node:path";
import fs from "node:fs/promises";
import url from "node:url";
import { randomUUID } from "node:crypto";
import { context as esbuildContext } from "esbuild";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export async function getContext(
  onBuild: (isRebuild: boolean) => Promise<void> = async () => {},
) {
  const buildId = randomUUID().replace(/-/g, "");

  const context = await esbuildContext({
    platform: "node",
    target: "node21",
    format: "esm",
    nodePaths: [path.join(__dirname, "../src")],
    sourcemap: true,
    external: ["pg-native"],
    bundle: true,
    outdir: path.join(__dirname, "../build"),
    entryPoints: [path.join(__dirname, "../src/index.ts")],
    banner: {
      js: `
        import { createRequire as createRequire${buildId} } from 'module';
        import { fileURLToPath as fileURLToPath${buildId} } from 'url';
        import { dirname as dirname${buildId} } from 'path';

        // using var here to allow subsequent override by authors of this
        // library that would be using the same ESM trick
        var require = createRequire${buildId}(import.meta.url);
        var __filename = fileURLToPath${buildId}(import.meta.url);
        var __dirname = dirname${buildId}(__filename);
      `,
    },
    plugins: [
      {
        name: "onBuild",
        setup(build) {
          let isRebuild = false;

          build.onEnd(async (result) => {
            if (result.errors.length > 0) {
              console.log("Errors", result.errors);
              return;
            }

            await copyLuaCommands();
            await onBuild(isRebuild);

            isRebuild = true;
          });
        },
      },
    ],
  });

  await copyLuaCommands();

  return context;
}

async function build() {
  const context = await getContext();

  await context.rebuild();
  await context.dispose();
}

// prevent bullmq from reading from node_modules that might not exist if we
// bundle the files
async function copyLuaCommands() {
  const source = path.join(
    __dirname,
    "../node_modules/bullmq/dist/cjs/commands",
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
        path.join(target, "includes", file),
      );
    }
  }
}

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    await build();
  }
}
