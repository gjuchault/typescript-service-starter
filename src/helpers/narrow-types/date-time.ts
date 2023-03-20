// TODO: use temporal

import { Brand, make } from "ts-brand";
import { Option, Some as some, None as none } from "ts-results";

export type ValidDateTime = Brand<string, "ValidDateTime">;
export type ValidDate = Brand<string, "ValidDate">;

export function makeValidDateTime(
  input: Date | string | number
): Option<ValidDateTime> {
  const inputAsDate = new Date(input);
  return isValidDateTime(inputAsDate)
    ? some(make<ValidDateTime>()(inputAsDate.toISOString()))
    : none;
}

export function makeValidDate(input: string): Option<ValidDate> {
  return isValidDate(input) ? some(make<ValidDate>()(input)) : none;
}

function isValidDateTime(input: Date): boolean {
  return !Number.isNaN(input.getTime());
}

function isValidDate(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input) && isValidDateTime(new Date(input));
}
