export function promiseWithTimeout<T>(
  timeoutMs: number,
  promise: () => Promise<T>,
  onTimeout?: () => void
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      if (typeof onTimeout === "function") {
        return onTimeout();
      }

      reject(new Error("Promise timed out"));
    }, timeoutMs);
  });

  return Promise.race([promise(), timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
}
