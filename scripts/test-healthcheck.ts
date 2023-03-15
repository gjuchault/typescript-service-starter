import { exec } from "node:child_process";
import url from "node:url";
import { getContext } from "./build";

async function testHealthcheck() {
  const context = await getContext();
  await context.rebuild();
  await context.dispose();

  const appProcess = exec("node build", {
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });

  appProcess.stdout?.pipe(process.stdout);
  appProcess.stderr?.pipe(process.stderr);

  let interval = setInterval(async () => {
    try {
      const fetchResult = await fetch(
        "http://127.0.0.1:8080/api/healthcheck.healthcheck"
      );

      if (fetchResult.ok || process.env.CI !== undefined) {
        process.exit(0);
      }
    } catch {}
  }, 1000);

  setTimeout(() => {
    clearInterval(interval);
    console.error(
      "Server did not return HTTP 200 on GET /healthcheck after 10 seconds"
    );
    process.exit(1);
  }, 10 * 1000);
}

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
    await testHealthcheck();
  }
}
