import { z } from "zod";
import { config } from "../../../../infrastructure/config/config.ts";
import type { Database } from "../../../../infrastructure/database/database.ts";
import type { HttpServer } from "../../../../infrastructure/http-server/http-server.ts";
import type { Telemetry } from "../../../../infrastructure/telemetry/telemetry.ts";
import { packageJson } from "../../../../packageJson.ts";
import { userService } from "../../application/index.ts";
import { userIdSchema } from "../../domain/user.ts";
import { userRepository } from "../../repository/index.ts";

export function bindUserRoutes({
	telemetry,
	database,
	httpServer,
}: {
	telemetry: Telemetry;
	database: Database;
	httpServer: HttpServer;
}) {
	httpServer.route({
		method: "GET",
		url: "/api/users",
		handler: async (request, reply) => {
			const parseIdsResult = z
				.object({
					ids: z.union([
						// ?ids=1
						z.coerce.number(),
						// ?ids=1&ids=2
						z
							.array(z.coerce.number().pipe(userIdSchema))
							.nonempty(),
					]),
				})
				.safeParse(request.query);

			if (!parseIdsResult.success) {
				reply.code(400).send(parseIdsResult.error.flatten());
				return;
			}

			const users = await userService.getUsers(
				{
					ids: Array.isArray(parseIdsResult.data.ids)
						? parseIdsResult.data.ids
						: [parseIdsResult.data.ids],
				},
				{ database, userRepository, config, packageJson, telemetry },
			);

			if (users.ok === false) {
				reply.code(500).send(users.error);
				return;
			}

			reply.send(users.value);
		},
	});
}
