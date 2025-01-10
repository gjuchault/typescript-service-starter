// TODO: investigate using Temporal instead

import { z } from "zod";

export const validDateTimeSchema = z
	.union([z.string(), z.date(), z.number()])
	.refine((input) => {
		const inputAsDate = new Date(input);
		if (!isValidDateTime(inputAsDate)) {
			return false;
		}

		return true;
	})
	.transform((input): string => new Date(input).toISOString())
	.brand<"ValidDateTime">();

export const validDateSchema = z
	.string()
	.refine((input) => {
		if (!isValidDate(input)) {
			return false;
		}

		return true;
	})
	.brand<"ValidDateTime">();

export type ValidDateTime = z.infer<typeof validDateTimeSchema>;
export type ValidDate = z.infer<typeof validDateSchema>;

function isValidDateTime(input: Date): boolean {
	return !Number.isNaN(input.getTime());
}

const validDateRegexp = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(input: string): boolean {
	return validDateRegexp.test(input) && isValidDateTime(new Date(input));
}
