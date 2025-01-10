import { z } from "zod";

const baseSafeInteger = z.number().int().safe();

export const finiteSchema = z.number().finite().brand<"Finite">();

export const positiveSchema = z.number().positive().brand<"Positive">();
export const nonNegativeSchema = z
	.number()
	.nonnegative()
	.brand<"NonNegative">();
export const negativeSchema = z.number().negative().brand<"Negative">();
export const nonPositiveSchema = z
	.number()
	.nonpositive()
	.brand<"NonPositive">();

export const safeIntegerSchema = baseSafeInteger.brand<"SafeInteger">();
export const positiveSafeIntegerSchema = baseSafeInteger
	.positive()
	.brand<"PositiveSafeInteger">();
export const nonNegativeSafeIntegerSchema = baseSafeInteger
	.nonnegative()
	.brand<"NonNegativeSafeInteger">();
export const negativeSafeIntegerSchema = baseSafeInteger
	.negative()
	.brand<"NegativeSafeInteger">();
export const nonPositiveSafeIntegerSchema = baseSafeInteger
	.nonpositive()
	.brand<"NonPositiveSafeInteger">();
