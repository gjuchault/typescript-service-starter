import { z } from "zod";
import {
	userEmailSchema,
	userIdSchema,
	userNameSchema,
	userSchema,
} from "../domain/user.ts";

const userInDatabaseSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string(),
});

export const userToDatabaseUserSchema = userSchema
	.transform((user) => user)
	.pipe(userInDatabaseSchema);

export const databaseUserToUserSchema = userInDatabaseSchema
	.transform((user) => ({
		id: userIdSchema.parse(user.id),
		name: userNameSchema.parse(user.name),
		email: userEmailSchema.parse(user.email),
	}))
	.pipe(userSchema);
