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

import type { HealthcheckRepository } from "~/repository/healthcheck";
import type { UserRepository } from "~/repository/user";
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
  httpServer,
  taskScheduling,
  telemetry,
  healthcheckRepository,
  userRepository,
}: {
  cache?: Partial<Cache>;
  database?: Partial<Database>;
  date?: Partial<DateProvider>;
  httpServer?: Partial<HttpServer>;
  taskScheduling?: Partial<TaskScheduling>;
  telemetry?: Partial<Telemetry>;
  healthcheckRepository?: Partial<HealthcheckRepository>;
  userRepository?: Partial<UserRepository>;
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
    httpServer: buildMock(httpServer),
    logger: createMockLoggerProvider(),
    taskScheduling: buildMock(taskScheduling),
    telemetry: buildMock(telemetry),
    healthcheckRepository: buildMock(healthcheckRepository),
    userRepository: buildMock(userRepository),
  });
}
