import { z } from "zod";

export const userIdSchema = z.number().brand<"UserId">();
export const userNameSchema = z.string().brand<"UserName">();
export const userEmailSchema = z.string().brand<"UserEmail">();

export const userSchema = z.object({
	id: userIdSchema,
	name: userNameSchema,
	email: userEmailSchema,
});

export type User = z.infer<typeof userSchema>;
