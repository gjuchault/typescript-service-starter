export function rejectUnexpectedValue(value: never) {
  throw new Error(`Unexpected value: ${value}`);
}
