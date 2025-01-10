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
import { SpanKind, context, propagation } from "@opentelemetry/api";
import { RedisStore } from "connect-redis";
import {
	type FastifyBaseLogger,
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
	fastify,
} from "fastify";
import {
	type ZodTypeProvider,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import yamlJs from "yamljs";
import { bindUserRoutes } from "../../contexts/user/presentation/http/index.ts";
import type { PackageJson } from "../../packageJson.ts";
import type { Cache } from "../cache/cache.ts";
import type { Config } from "../config/config.ts";
import type { Database } from "../database/database.ts";
import { createLogger } from "../logger/logger.ts";
import type { Span, Telemetry } from "../telemetry/telemetry.ts";

export type HttpServer = FastifyInstance<
	Server,
	IncomingMessage,
	ServerResponse,
	FastifyBaseLogger,
	ZodTypeProvider
>;
export type HttpRequest = FastifyRequest;
export type HttpReply = FastifyReply;

const yamlMime = /^application\/yaml$/;

export async function createHttpServer({
	telemetry,
	database,
	cache,
	config,
	packageJson,
}: {
	telemetry: Telemetry;
	database: Database;
	cache: Cache | undefined;
	config: Config;
	packageJson: Pick<
		PackageJson,
		"name" | "version" | "author" | "description" | "license"
	>;
}): Promise<HttpServer> {
	const span = telemetry.startSpan({
		spanName: "infrastructure/http-server/http-server@createHttpServer",
	});

	const logger = createLogger("http-server", { config, packageJson });

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

	httpServer.addHook("onRequest", (request, _response, done) => {
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
			async (span) => {
				spanByRequestId.set(request.id, span);

				logger.debug(`http request: ${request.method} ${request.url}`, {
					requestId: getRequestId(request),
					method: request.method,
					url: request.url,
					route: request.routeOptions.url,
					userAgent: request.headers["user-agent"],
				});

				await Promise.resolve();

				done();
			},
		);
	});

	await httpServer.register(acceptsSerializer, {
		serializers: [
			{
				regex: yamlMime,
				serializer: (body: unknown) => yamlJs.stringify(body),
			},
		],
		default: "application/json",
	});
	await httpServer.register(circuitBreaker);
	await httpServer.register(cors);
	await httpServer.register(formBody);
	await httpServer.register(helmet);
	await httpServer.register(multipart);
	await httpServer.register(rateLimit, {
		redis: cache,
	});
	await httpServer.register(cookie);
	await httpServer.register(session, {
		secret: [config.httpCookieSigningSecret],
		store: new RedisStore({ client: cache }),
	});
	await httpServer.register(underPressure);
	await httpServer.register(swagger, {
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
	});

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
			`http reply: ${request.method} ${request.url} ${reply.statusCode}`,
			{
				requestId: getRequestId(request),
				method: request.method,
				url: request.url,
				route: request.routeOptions.url,
				userAgent: request.headers["user-agent"],
				responseTime: Math.ceil(reply.elapsedTime),
				httpStatusCode: reply.statusCode,
			},
		);

		done();
	});

	httpServer.addHook("onError", (request, reply, error, done) => {
		logger.error(`http error (${error.code}): ${error.name} ${error.message}`, {
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
		});

		done();
	});

	httpServer.get("/api/healthcheck", (_request, reply) => {
		return reply.status(204).send();
	});

	httpServer.get("/api/docs", (_request, reply) => {
		return reply.send(httpServer.swagger());
	});

	bindUserRoutes({ database, httpServer, telemetry });

	httpServer.addHook("onListen", () => {
		logger.info(
			`http server listening on ${config.httpAddress}:${config.httpPort}`,
		);
	});

	span.end();

	return httpServer;
}

function getRequestId(request: FastifyRequest): string | undefined {
	if (typeof request.id === "string") {
		return request.id;
	}

	return undefined;
}
