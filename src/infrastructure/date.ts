export type DateProvider = {
  now: () => number;
};

export function dateProvider() {
  return {
    now: () => Date.now(),
  };
}
