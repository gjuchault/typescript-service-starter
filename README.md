# TypeScript Service Starter

![NPM](https://img.shields.io/npm/l/@gjuchault/typescript-service-starter)
![NPM](https://img.shields.io/npm/v/@gjuchault/typescript-service-starter)
![GitHub Workflow Status](https://github.com/gjuchault/typescript-service-starter/actions/workflows/typescript-service-starter.yml/badge.svg?branch=main)

Yet another (opinionated) TypeScript service starter template.

## Opinions and limitations

1. Follows Domain Driven Development and 3 Layers architecture
2. As little of externalities requirements as possible (outputs to stdout/stderr, no auth management, optional cache, etc.)
3. No dependency on node_modules folder and filesystem at runtime, to allow bundling & small Docker image
4. Config should not default to either development or production ([link](https://softwareengineering.stackexchange.com/a/375843))

And extends the ones from [typescript-library-starter](https://github.com/gjuchault/typescript-library-starter)

1. Relies as much as possible on each included library's defaults
2. Only relies on GitHub Actions
3. Does not include documentation generation
4. Always sets [NODE_ENV to production](https://cjihrig.com/node_env_considered_harmful) and use ENV_NAME for logging purposes

## Getting started

1. `npx degit gjuchault/typescript-service-starter my-project` or click on the `Use this template` button on GitHub!
2. `cd my-project`
3. `npm install`
4. `git init` (if you used degit)
5. `node --run setup`
6. `echo "HTTP_COOKIE_SIGNING_SECRET=$(node --run generate-secret)" > .env.local`

To enable deployment, you will need to:

1. Set up the `NPM_TOKEN` secret in GitHub Actions ([Settings > Secrets > Actions](https://github.com/gjuchault/typescript-service-starter/settings/secrets/actions))
2. Give `GITHUB_TOKEN` write permissions for GitHub releases ([Settings > Actions > General](https://github.com/gjuchault/typescript-service-starter/settings/actions) > Workflow permissions)

## Features

### HTTP Server and typed client

This template is based on Fastify with some nice defaults (circuit breaker, valkey rate limit, etc.). [openapi-typescript](https://openapi-ts.dev) is used to have nice routes & automatic client generation with zod and TypeScript.

Client should be published when this package is released. You can use openapi-fetch easily with it:

```ts
import createClient from "openapi-fetch";
import type { paths as api } from "typescript-service-starter";

export const client = createClient<api>({ baseUrl: "" });

const res = await client.GET("/api/docs");
```

You can check [openapi-ts's documentation](https://openapi-ts.dev/introduction) for more details.

Commands:

- `generate-client`: creates the `client/` folder with YAML and JSON OpenAPI schemas as well as openapi-typescript' schemas

### Databases

It leverages PostgreSQL as a storage (through [slonik](https://github.com/gajus/slonik)), [umzug](https://github.com/sequelize/umzug) for migrations, Valkey (or compatible like [KeyDB](https://docs.keydb.dev) or [Dragonfly](https://www.dragonflydb.io)) as a cache through [valkey](https://github.com/valkey-io/valkey-glide).

Commands:

- `migrate:up`: run migrations up to the latest one
- `migrate:down [n=1]`: revert n migrations
- `migrate:create`: create a new migration file

### Telemetry

For the logging & telemetry part, it uses [pino](https://github.com/pinojs/pino) and [OpenTelemetry](https:/github.com/open-telemetry/opentelemetry-js) (for both tracing and metrics). To handle distributed tracing, it expects [W3C's traceparent](https://www.w3.org/TR/trace-context/) header to carry trace id & parent span id (example header: `traceparent: '00-82d7adc64d7020e7fe7ff263dd5ba4dc-dd932b8fbc70946d-01'`).

You can find an example of a working fullstack telemetry in `docker-compose.yaml`, where this service directly pushes to prometheus and jaeger without the use of a collector.

### Layers & folder structure

```
src/
├── contexts       # contexts your service is handling (in the DDD sense)
│   ├── your-context
│   │   ├── application  # service code
│   │   ├── domain       # pure functions & TypeScript models of your entities
│   │   ├── presentation # communication layer (http)
│   │   ├── repository   # storage of your entities
├── helpers        # utilities functions & non-domain code
├── infrastructure # technical components (cache, database connection, etc.)
└── test-helpers   # test utilities (starting default port, resetting database, etc.)
```

Dependencies are passed as last-parameter so methods are testable easily and avoid mocking modules.

### Node.js, npm version

TypeScript Service Starter relies on [Volta](https://volta.sh/) to ensure Node.js version to be consistent across developers. It's also used in the GitHub workflow file.

### TypeScript

Leverages node's type to avoid build step, but keeps `tsc` to generate `.d.ts` files.

Commands:

- `start`: starts the bundled (see below) server with `.env` and `.env.local` env files
- `dev`: starts `src` server with `.env` and `.env.local` files
- `worker`: starts the worker with `.env`, `.env.local` env files
- `type:check`: validates types with `tsc`

### Production build and Docker

In development, the typescript code is run with node (--strip-types). However, the production build is _bundled_ with esbuild. This means you can _not_ leverage node_modules and file system at runtime: reading static files from node_modules, hooking `require`, etc. will not be possible. This implies to be mindful on libraries (that would read static files from there older), or automatic instrumentation (that hook `require`).

Running `node --run bundle` will bundle all of the `src/` and `node_modules/` code into two files:

- `build/index.js` which runs the server
- `build/worker.js` which runs the task scheduler's worker

This results in super small Docker images that are fast to deploy: the production image only contains alpine, node, env files and the bundle files — no node_modules folder. The one tradeoff is that dependencies cannot base their code on a file structure containing a `node_modules` folder (typically used to find static files).

Commands:

- `bundle`: creates the `build/` directory containing the entrypoints and shared code
- `start:prod`: runs the http server entrypoint
- `worker:prod`: runs the worker entrypoint

### Tests

TypeScript Library Starter uses [Node.js's native test runner](https://nodejs.org/api/test.html). Coverage is done using [c8](https://github.com/bcoe/c8) but will switch to Node.js's one once out.

Commands:

- `test`: runs test runner for both unit and integration tests
- `test:watch`: runs test runner in watch mode
- `test:coverage`: runs test runner and generates coverage reports

### Format & lint

This template relies on [Biome](https://biomejs.dev) to format and lint. It also uses [cspell](https://github.com/streetsidesoftware/cspell) to ensure correct spelling.

Commands:

- `lint`: runs Biome with automatic fixing
- `lint:check`: runs Biome without automatic fixing (used in CI)
- `spell:check`: runs spell checking

### Releasing

Under the hood, this service uses [semantic-release](https://github.com/semantic-release/semantic-release) and [Commitizen](https://github.com/commitizen/cz-cli).
The goal is to avoid manual release processes. Using `semantic-release` will automatically create a GitHub release (hence tags) as well as an npm release.
Based on your commit history, `semantic-release` will automatically create a patch, feature or breaking release.

Commands:

- `cz`: interactive CLI that helps you generate a proper git commit message, using [Commitizen](https://github.com/commitizen/cz-cli)
- `semantic-release`: triggers a release (used in CI)
