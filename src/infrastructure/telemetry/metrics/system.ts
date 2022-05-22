import perfHooks, { Histogram, NodeGCPerformanceDetail } from "node:perf_hooks";
import { ValueType } from "@opentelemetry/api-metrics";
import { metrics } from "..";

// https://github.com/siimon/prom-client/blob/master/lib/metrics

const startInSeconds = Math.round(Date.now() / 1000 - process.uptime());

export function bindSystemMetrics() {
  // eventLoopLag
  const eventLoopDelay = perfHooks.monitorEventLoopDelay();
  eventLoopDelay.enable();

  const eventLoopKeys: (keyof Histogram)[] = ["min", "max", "mean", "stddev"];

  for (const key of eventLoopKeys) {
    metrics.createObservableGauge(
      `nodejs_eventloop_lag_${key}_seconds`,
      (observableResult) => {
        observableResult.observe((eventLoopDelay[key] as number) / 1e9);
      },
      {
        description: `${key} event loop lag in seconds`,
        unit: "seconds",
        valueType: ValueType.DOUBLE,
      }
    );
  }

  const percentileKeys = [50, 90, 99];
  for (const percentile of percentileKeys) {
    metrics.createObservableGauge(
      `nodejs_eventloop_lag_p${percentile.toString()}_seconds`,
      (observableResult) => {
        observableResult.observe(eventLoopDelay.percentile(percentile) / 1e9);
      },
      {
        description: `The ${percentile.toString()}th percentile of the recorded event loop delays`,
        unit: "seconds",
        valueType: ValueType.DOUBLE,
      }
    );
  }

  // gc
  const gcHistogram = metrics.createHistogram("nodejs_gc_duration_seconds", {
    description:
      "Garbage collection duration by kind, one of major, minor, incremental or weakcb in seconds",
    unit: "seconds",
    valueType: ValueType.DOUBLE,
  });

  const kinds = new Map<number, string>();
  kinds.set(perfHooks.constants.NODE_PERFORMANCE_GC_MAJOR, "major");
  kinds.set(perfHooks.constants.NODE_PERFORMANCE_GC_MINOR, "minor");
  kinds.set(perfHooks.constants.NODE_PERFORMANCE_GC_INCREMENTAL, "incremental");
  kinds.set(perfHooks.constants.NODE_PERFORMANCE_GC_WEAKCB, "weakcb");

  const gcObserver = new perfHooks.PerformanceObserver((list) => {
    const entry = list.getEntries()[0];
    const kind = (entry.detail as NodeGCPerformanceDetail).kind;

    if (!kind) {
      return;
    }

    gcHistogram.record(entry.duration / 1000, { kind: kinds.get(kind) ?? "" });
  });
  gcObserver.observe({ entryTypes: ["gc"] });

  // heapSizeAndUsed
  // share a variable to avoid discrepancies between values
  let sharedMemoryUsage: NodeJS.MemoryUsage;
  const memoryKeys: (keyof NodeJS.MemoryUsage)[] = [
    "heapTotal",
    "heapUsed",
    "external",
  ];
  for (const key of memoryKeys) {
    metrics.createObservableGauge(
      "nodejs_heap_size_total_bytes",
      (observableResult) => {
        if (key === "heapTotal") {
          try {
            sharedMemoryUsage = process.memoryUsage();
            observableResult.observe(sharedMemoryUsage[key]);
          } catch {
            // ignore
          }
        } else {
          observableResult.observe(sharedMemoryUsage[key]);
        }
      },
      {
        description: `${key} size in bytes`,
        unit: "bytes",
        valueType: ValueType.INT,
      }
    );
  }

  // processCpuTotal
  let lastCpuUsage = process.cpuUsage();
  let sharedCpuUsage: NodeJS.CpuUsage;
  for (const key of ["user", "system", "shared"]) {
    metrics.createObservableCounter(
      `process_cpu_${key}_seconds_total`,
      (observableResult) => {
        if (key === "user") {
          sharedCpuUsage = process.cpuUsage();
          // wait for other counters to report
          setTimeout(() => {
            lastCpuUsage = sharedCpuUsage;
          });
        }

        const userUsageMicros = sharedCpuUsage.user - lastCpuUsage.user;
        const systemUsageMicros = sharedCpuUsage.system - lastCpuUsage.system;

        const value =
          key === "user"
            ? userUsageMicros
            : key === "system"
            ? systemUsageMicros
            : userUsageMicros + systemUsageMicros;

        observableResult.observe(value / 1e6);
      },
      {
        description: `Total ${key} CPU time spent in seconds`,
        unit: "seconds",
        valueType: ValueType.DOUBLE,
      }
    );
  }

  // processHandles
  metrics.createObservableGauge("nodejs_active_handles", (observableResult) => {
    const handles = (
      process as unknown as Record<string, () => []>
    )._getActiveHandles();

    observableResult.observe(handles.length);
  });

  // processStartTime
  metrics.createObservableGauge(
    "nodejs_process_start_time_seconds",
    (observableResult) => {
      observableResult.observe(startInSeconds);
    },
    {
      description: "Start time of the process in seconds unix timestamp",
      unit: "seconds",
      valueType: ValueType.INT,
    }
  );

  metrics.createObservableGauge(
    "nodejs_process_up_time_seconds",
    (observableResult) => {
      observableResult.observe(Math.round(Date.now() / 1000 - startInSeconds));
    },
    {
      description: "Up time of the process in seconds",
      unit: "seconds",
      valueType: ValueType.INT,
    }
  );
}
