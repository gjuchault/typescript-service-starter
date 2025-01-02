import { randomUUID } from "node:crypto";
import acceptsSerializer from "@fastify/accepts-serializer";
import circuitBreaker from "@fastify/circuit-breaker";
import cors from "@fastify/cors";
import formBody from "@fastify/formbody";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import secureSession from "@fastify/secure-session";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import underPressure from "@fastify/under-pressure";
import {
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
import type { PackageJson } from "../../packageJson.ts";
import type { Config } from "../config/config.ts";
import { createLogger } from "../logger/logger.ts";
import type { Cache } from "../cache/cache.ts";

export type HttpServer = FastifyInstance;
export type HttpRequest = FastifyRequest;
export type HttpReply = FastifyReply;

const yamlMime = /^application\/yaml$/;

export async function createHttpServer({
	cache,
	config,
	packageJson,
}: {
	cache: Cache | undefined;
	config: Config;
	packageJson: PackageJson;
}): Promise<HttpServer> {
	const logger = createLogger("http-server", { config, packageJson });

	const httpServer = fastify({
		requestTimeout: config.httpRequestTimeout,
		logger: false,
		requestIdHeader: "x-request-id",
		maxParamLength: 10_000,
		genReqId() {
			return randomUUID();
		},
	});

	httpServer.setValidatorCompiler(validatorCompiler);
	httpServer.setSerializerCompiler(serializerCompiler);

	await httpServer.register(acceptsSerializer, {
		serializers: [
			{
				regex: yamlMime,
				serializer: (body: unknown) => yamlJs.stringify(body),
			},
		],
		default: "application/yaml",
	});
	await httpServer.register(circuitBreaker);
	await httpServer.register(cors);
	await httpServer.register(formBody);
	await httpServer.register(helmet);
	await httpServer.register(multipart);
	await httpServer.register(rateLimit, {
		redis: cache,
	});
	await httpServer.register(secureSession, {
		key: Buffer.from(config.httpCookieSigningSecret, "hex"),
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

	await httpServer.register(swaggerUi, {
		uiConfig: {
			docExpansion: "full",
			deepLinking: false,
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

	httpServer.addHook("onRequest", (request, _response, done) => {
		logger.debug(`http request: ${request.method} ${request.url}`, {
			requestId: getRequestId(request),
			method: request.method,
			url: request.url,
			route: request.routeOptions.url,
			userAgent: request.headers["user-agent"],
		});

		done();
	});

	httpServer.addHook("onResponse", (request, reply, done) => {
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

	httpServer.get("/api/docs", (_request, reply) => {
		return reply.send(httpServer.swagger());
	});

	const address = await httpServer.listen({
		host: config.httpAddress,
		port: config.httpPort,
	});

	logger.info(`http server listening on ${address}`);

	return httpServer.withTypeProvider<ZodTypeProvider>();
}

function getRequestId(request: FastifyRequest): string | undefined {
	if (typeof request.id === "string") {
		return request.id;
	}

	return undefined;
}
