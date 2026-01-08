import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import acceptsSerializer from "@fastify/accepts-serializer";
import circuitBreaker from "@fastify/circuit-breaker";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import formBody from "@fastify/formbody";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import session from "@fastify/session";
import swagger from "@fastify/swagger";
import underPressure from "@fastify/under-pressure";
import { context, propagation, SpanKind } from "@opentelemetry/api";
import { ValkeyStore } from "connect-valkey";
import {
	type FastifyBaseLogger,
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
	fastify,
} from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { gen, noop, unsafeFlowOrThrow } from "ts-flowgen";
import yamlJs from "yamljs";
import { bindUserRoutes } from "../../contexts/user/presentation/http/index.ts";
import type { PackageJson } from "../../packageJson.ts";
import type { Cache } from "../cache/cache.ts";
import type { Config } from "../config/config.ts";
import type { Database } from "../database/database.ts";
import { createLogger } from "../logger/logger.ts";
import type { TaskScheduling } from "../task-scheduling/task-scheduling.ts";
import type { Span, Telemetry } from "../telemetry/telemetry.ts";
import { RateLimitValkeyStore } from "./rate-limit-valkey.ts";

export type HttpServer = FastifyInstance<
	Server,
	IncomingMessage,
	ServerResponse,
	FastifyBaseLogger,
	ZodTypeProvider
>;
export type HttpRequest = FastifyRequest;
export type HttpReply = FastifyReply;

type HttpServerSetupError = { name: "httpServerSetupError"; error: unknown };
function httpServerSetupError(error: unknown): HttpServerSetupError {
	return { name: "httpServerSetupError", error };
}

const yamlMime = /^application\/yaml$/;

export async function* createHttpServer({
	telemetry,
	database,
	cache,
	taskScheduling,
	config,
	packageJson,
}: {
	telemetry: Telemetry;
	database: Database;
	cache: Cache | undefined;
	config: Config;
	taskScheduling: Pick<TaskScheduling, "sendInTransaction">;
	packageJson: Pick<
		PackageJson,
		"name" | "version" | "author" | "description" | "license"
	>;
}): AsyncGenerator<HttpServerSetupError, HttpServer> {
	const span = telemetry.startSpan({
		spanName: "infrastructure/http-server/http-server@createHttpServer",
	});

	const logger = createLogger("http-server", { config, packageJson });

	logger.info(
		{ address: config.httpAddress, port: config.httpPort },
		"creating http server",
	);

	const spanByRequestId = new Map<string, Span>();

	const httpServer = fastify({
		requestTimeout: config.httpRequestTimeout,
		logger: false,
		requestIdHeader: "x-request-id",
		maxParamLength: 10_000,
		genReqId() {
			return randomUUID();
		},
	}).withTypeProvider<ZodTypeProvider>();

	httpServer.setValidatorCompiler(validatorCompiler);
	httpServer.setSerializerCompiler(serializerCompiler);

	httpServer.addHook("onRequest", async (request, _response) => {
		await unsafeFlowOrThrow(() =>
			telemetry.startSpanWith(
				{
					spanName: "infrastructure/http-server/http-server@onRequest",
					context: propagation.extract(context.active(), request.headers),
					options: {
						kind: SpanKind.SERVER,
						attributes: {
							"req.id": request.id,
							"req.method": request.raw.method,
							"req.url": request.raw.url,
						},
					},
				},
				async function* (span) {
					spanByRequestId.set(request.id, span);

					logger.debug(
						{
							requestId: getRequestId(request),
							method: request.method,
							url: request.url,
							route: request.routeOptions.url,
							userAgent: request.headers["user-agent"],
						},
						`http request: ${request.method} ${request.url}`,
					);

					yield* noop();
				},
			),
		);
	});

	yield* gen(
		() =>
			httpServer.register(acceptsSerializer, {
				serializers: [
					{
						regex: yamlMime,
						serializer: (body: unknown) => yamlJs.stringify(body),
					},
				],
				default: "application/json",
			}),
		httpServerSetupError,
	)();
	yield* gen(() => httpServer.register(circuitBreaker), httpServerSetupError)();
	yield* gen(() => httpServer.register(cors), httpServerSetupError)();
	yield* gen(() => httpServer.register(formBody), httpServerSetupError)();
	yield* gen(() => httpServer.register(helmet), httpServerSetupError)();
	yield* gen(() => httpServer.register(multipart), httpServerSetupError)();

	if (cache !== undefined) {
		RateLimitValkeyStore.setClient(cache);
		yield* gen(
			() =>
				httpServer.register(rateLimit, {
					store: RateLimitValkeyStore,
				}),
			httpServerSetupError,
		)();
	} else {
		yield* gen(
			() =>
				httpServer.register(rateLimit, { max: 100, timeWindow: "1 minute" }),
			httpServerSetupError,
		)();
	}

	yield* gen(() => httpServer.register(cookie), httpServerSetupError)();
	yield* gen(
		() =>
			httpServer.register(session, {
				secret: [config.httpCookieSigningSecret],
				...(cache !== undefined
					? { store: new ValkeyStore({ client: cache.unwrapped }) }
					: {}),
			}),
		httpServerSetupError,
	)();
	yield* gen(() => httpServer.register(underPressure), httpServerSetupError)();
	yield* gen(
		() =>
			httpServer.register(swagger, {
				openapi: {
					openapi: "3.1.1",
					info: {
						title: packageJson.name,
						description: packageJson.description,
						version: packageJson.version,
						contact: packageJson.author,
						license: {
							name: packageJson.license,
						},
					},
				},
			}),
		httpServerSetupError,
	)();

	httpServer.setNotFoundHandler(
		{
			preHandler: httpServer.rateLimit(),
		},
		(_request, reply) => {
			reply.code(404).send();
		},
	);

	httpServer.addHook("onResponse", (request, reply, done) => {
		const span = spanByRequestId.get(request.id);

		if (span !== undefined) {
			span.setAttributes({
				"res.statusCode": reply.statusCode,
			});

			span.end();
			spanByRequestId.delete(request.id);
		}

		logger.debug(
			{
				requestId: getRequestId(request),
				method: request.method,
				url: request.url,
				route: request.routeOptions.url,
				userAgent: request.headers["user-agent"],
				responseTime: Math.ceil(reply.elapsedTime),
				httpStatusCode: reply.statusCode,
			},
			`http reply: ${request.method} ${request.url} ${reply.statusCode}`,
		);

		done();
	});

	httpServer.addHook("onError", (request, reply, error, done) => {
		logger.error(
			{
				requestId: getRequestId(request),
				error: {
					name: error.name,
					message: error.message,
					code: error.code,
					stack: error.stack,
				},
				method: request.method,
				url: request.url,
				route: request.routeOptions.url,
				userAgent: request.headers["user-agent"],
				responseTime: Math.ceil(reply.elapsedTime),
				httpStatusCode: reply.statusCode,
			},
			`http error (${error.code}): ${error.name} ${error.message}`,
		);

		done();
	});

	httpServer.get("/api/healthcheck", (_request, reply) => {
		return reply.status(200).send();
	});

	httpServer.get("/api/docs", (_request, reply) => {
		return reply.send(httpServer.swagger());
	});

	bindUserRoutes({ database, httpServer, telemetry, taskScheduling });

	httpServer.addHook("onListen", () => {
		logger.info(
			`http server listening on ${config.httpAddress}:${config.httpPort}`,
		);
	});

	yield* gen(() => httpServer.ready(), httpServerSetupError)();

	logger.info({ routes: httpServer.printRoutes() }, "http server ready");

	span.end();

	return httpServer;
}

function getRequestId(request: FastifyRequest): string | undefined {
	if (typeof request.id === "string") {
		return request.id;
	}

	return undefined;
}
