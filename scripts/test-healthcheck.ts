import { exec } from "node:child_process";
import url from "node:url";
import { getContext } from "./build";
import ms from "ms";

async function testHealthcheck() {
  const context = await getContext();
  await context.rebuild();
  await context.dispose();

  const appProcess = exec("node build/index.js", {
    env: {
      ...process.env,
    },
  });

  appProcess.stdout?.pipe(process.stdout);
  appProcess.stderr?.pipe(process.stderr);

  let interval = setInterval(async () => {
    try {
      const fetchResult = await fetch("http://127.0.0.1:8080/api/healthcheck");

      if (fetchResult.ok) {
        appProcess.kill("SIGTERM");
        process.exit(0);
      }
    } catch {}
  }, ms("1sec"));

  setTimeout(() => {
    clearInterval(interval);
    console.error(
      "Server did not return HTTP 200 on GET /healthcheck after 10 seconds",
    );
    appProcess.kill("SIGTERM");
    process.exit(1);
  }, ms("30sec"));
}

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    await testHealthcheck();
  }
}
