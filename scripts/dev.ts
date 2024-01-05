import path from "node:path";
import { ChildProcess, fork } from "node:child_process";
import url from "node:url";
import ms from "ms";
import { getContext } from "./build";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const rootPath = path.join(__dirname, "..");
const bundleFilePath = path.join(rootPath, "build", "index.js");

async function dev() {
  const context = await getContext(async (isRebuild) => {
    await onBuild(isRebuild);
  });

  await context.watch();
}

let subProcess: ChildProcess | undefined = undefined;

async function onBuild(isRebuild = false) {
  await killSubProcess();

  if (isRebuild) {
    console.log();
    console.log("=".repeat(50));
    console.log("=".repeat(50));
    console.log();
  }

  subProcess = fork(bundleFilePath, [], {
    cwd: rootPath,
    execPath: process.execPath,
    env: {
      NODE_ENV: "production",
      ENV_NAME: "test",
    },
    execArgv: ["--inspect=0.0.0.0:9229"],
  });
}

async function killSubProcess() {
  return new Promise((resolve) => {
    if (!subProcess) {
      resolve(undefined);
      return;
    }

    subProcess.on("close", () => {
      subProcess = undefined;
      resolve(undefined);
    });

    setTimeout(() => {
      subProcess?.kill("SIGKILL");
      subProcess = undefined;
      resolve(subProcess);
    }, ms("5s"));

    subProcess.kill();
  });
}

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    await dev();
  }
}
