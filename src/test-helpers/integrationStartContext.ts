import { main as startApp } from "../index";

export async function setup() {
  const { default: getPort } = await import("get-port");
  const port = await getPort();

  const app = await startApp({
    configOverride: {
      port,
      logLevel: "error",
    },
  });

  return {
    http: app.httpServer,
    shutdown: () => app.shutdown.shutdown(false),
  };
}
