import { main as startApp } from "../index";

const shutdownByPort = new Map<number, () => Promise<void>>();

export async function setup() {
  const { default: getPort } = await import("get-port");
  const port = await getPort();

  const app = await startApp({
    configOverride: {
      port,
      logLevel: "error",
    },
  });

  shutdownByPort.set(port, app.shutdown);

  return {
    http: app.httpServer,
    shutdown: () => app.shutdown(false),
  };
}
