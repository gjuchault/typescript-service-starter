import { Brand, make } from "ts-brand";
import { Option, Some as some, None as none } from "ts-results";

export type SafeInteger = Brand<number, "Integer">;
export type PositiveInteger = Brand<number, "PositiveInteger">;
export type PositiveNonZeroInteger = Brand<number, "PositiveNonZeroInteger">;
export type NegativeInteger = Brand<number, "NegativeInteger">;
export type PositiveNumber = Brand<number, "PositiveNumber">;
export type PositiveNonZeroNumber = Brand<number, "PositiveNonZeroNumber">;
export type NegativeNumber = Brand<number, "NegativeNumber">;

export function makeSafeInteger(input: number): Option<SafeInteger> {
  return validateNumber(input) && validateInteger(input)
    ? some(make<SafeInteger>()(input))
    : none;
}

export function makePositiveInteger(input: number): Option<PositiveInteger> {
  return validateNumber(input) &&
    validateInteger(input) &&
    validatePositiveNumber(input)
    ? some(make<PositiveInteger>()(input))
    : none;
}

export function makePositiveNonZeroInteger(
  input: number
): Option<PositiveNonZeroInteger> {
  return validateNumber(input) &&
    validateInteger(input) &&
    validatePositiveNumber(input) &&
    validateNonZeroNumber(input)
    ? some(make<PositiveNonZeroInteger>()(input))
    : none;
}

export function makeNegativeInteger(input: number): Option<NegativeInteger> {
  return validateNumber(input) &&
    validateInteger(input) &&
    validateNegativeNumber(input)
    ? some(make<NegativeInteger>()(input))
    : none;
}

export function makePositiveNumber(input: number): Option<PositiveNumber> {
  return validateNumber(input) && validatePositiveNumber(input)
    ? some(make<PositiveNumber>()(input))
    : none;
}

export function makePositiveNonZeroNumber(
  input: number
): Option<PositiveNonZeroNumber> {
  return validateNumber(input) &&
    validatePositiveNumber(input) &&
    validateNonZeroNumber(input)
    ? some(make<PositiveNonZeroNumber>()(input))
    : none;
}

export function makeNegativeNumber(input: number): Option<NegativeNumber> {
  return validateNumber(input) && validateNegativeNumber(input)
    ? some(make<NegativeNumber>()(input))
    : none;
}

function validateNumber(input: number): boolean {
  return Number.isFinite(input);
}

function validatePositiveNumber(input: number): boolean {
  return input >= 0;
}

function validateNegativeNumber(input: number): boolean {
  return input < 0;
}

function validateNonZeroNumber(input: number): boolean {
  return input !== 0;
}

function validateInteger(input: number): boolean {
  return Number.isSafeInteger(input);
}
