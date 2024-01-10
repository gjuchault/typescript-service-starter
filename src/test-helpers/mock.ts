// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable security/detect-object-injection */
import { mock } from "node:test";

import type {
  Cache,
  Database,
  DateProvider,
  HttpServer,
  TaskScheduling,
  Telemetry,
} from "@gjuchault/typescript-service-sdk";
import { createMockLoggerProvider } from "@gjuchault/typescript-service-sdk";

import type { HealthcheckApplication } from "~/application/healthcheck";
import type { Repository } from "~/repository";
import { createAppDependencyStore } from "~/store";

export function buildMock<T>(initialImplementation: Partial<T> = {}): T {
  const store: Partial<T> = {};

  for (const key of Object.keys(initialImplementation) as (keyof T)[]) {
    const implementation = initialImplementation[key];

    store[key] =
      typeof implementation === "function"
        ? mock.fn(implementation)
        : implementation;
  }

  const proxy = new Proxy(store, {
    get(_target, propertyName) {
      const function2 = Reflect.get(store, propertyName);
      if (!function2 && propertyName !== "then") {
        const mockFunction = mock.fn();
        Reflect.set(store, propertyName, mockFunction);
        return mockFunction;
      }
      return function2;
    },

    set(_target, propertyName, propertyValue) {
      return Reflect.set(store, propertyName, propertyValue);
    },
  });

  return proxy as T;
}

export function buildMockDependencyStore({
  cache,
  database,
  date,
  healthcheckApplication,
  httpServer,
  repository,
  taskScheduling,
  telemetry,
}: {
  cache?: Partial<Cache>;
  database?: Partial<Database>;
  date?: Partial<DateProvider>;
  healthcheckApplication?: Partial<HealthcheckApplication>;
  httpServer?: Partial<HttpServer>;
  repository?: Partial<Repository>;
  taskScheduling?: Partial<TaskScheduling>;
  telemetry?: Partial<Telemetry>;
}) {
  return createAppDependencyStore({
    cache: buildMock(cache),
    database: buildMock(database),
    date: buildMock(
      date ?? {
        nowAsDate: () => new Date("2020-05-20"),
        nowAsNumber: () => new Date("2020-05-20").getTime(),
      },
    ),
    healthcheckApplication: buildMock(healthcheckApplication),
    httpServer: buildMock(httpServer),
    logger: createMockLoggerProvider(),
    repository: buildMock(repository),
    taskScheduling: buildMock(taskScheduling),
    telemetry: buildMock(telemetry),
  });
}
