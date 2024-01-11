# TypeScript Service Starter

![NPM](https://img.shields.io/npm/l/@gjuchault/typescript-service-starter)
![NPM](https://img.shields.io/npm/v/@gjuchault/typescript-service-starter)
![GitHub Workflow Status](https://github.com/gjuchault/typescript-service-starter/actions/workflows/typescript-service-starter.yml/badge.svg?branch=main)

Yet another (opinionated) TypeScript service starter template.

## Opinions and limitations

1. Tries to follow Domain Driven Development and 3 Layers architecture
2. As little of externalities requirements as possible (outputs to stdout/stderr, no auth management, etc.)
3. No dependency on node_modules folder and filesystem at runtime, to allow bundling & small Docker image
4. Config should not default to either development or production ([link](https://softwareengineering.stackexchange.com/a/375843))

And extends the ones from [typescript-library-starter](https://github.com/gjuchault/typescript-library-starter)

1. Relies as much as possible on each included library's defaults
2. Only relies on GitHub Actions
3. Does not include documentation generation
4. Always set [NODE_ENV to production](https://cjihrig.com/node_env_considered_harmful) and use ENV_NAME for logging purposes

## Getting started

1. `npx degit gjuchault/typescript-service-starter my-project` or click on the `Use this template` button on GitHub!
2. `cd my-project`
3. `npm install`
4. `git init` (if you used degit)
5. `npm run setup`

To enable deployment, you will need to:

1. Set up the `NPM_TOKEN` secret in GitHub Actions ([Settings > Secrets > Actions](https://github.com/gjuchault/typescript-service-starter/settings/secrets/actions))
2. Give `GITHUB_TOKEN` write permissions for GitHub releases ([Settings > Actions > General](https://github.com/gjuchault/typescript-service-starter/settings/actions) > Workflow permissions)

## Features

### Ecosystem

This template is based on Fastify with some nice defaults (circuit breaker, redis rate limit, etc.). [ts-rest](https://ts-rest.com/) is used to have nice routes & automatic client generations with zod and TypeScript.
It leverages PostgreSQL as a storage (through [slonik](https://github.com/gajus/slonik)), Redis as a cache through [ioredis](https://github.com/luin/ioredis)).

For the logging & telemetry part, it uses [pino](https://github.com/pinojs/pino) and [OpenTelemetry](https:/github.com/open-telemetry/opentelemetry-js) (for both prometheus-like metrics & tracing). To handle distributed tracing, it expects [W3C's traceparent](https://www.w3.org/TR/trace-context/) header to carry trace id & parent span id.

To run tasks & crons, this package leverages [BullMQ](https://github.com/taskforcesh/bullmq).

This template also tries to be easy to deploy through esbuild's bundling. This means you can _not_ leverage node_modules and file system at runtime: reading static files from node_modules, hooking `require`, etc. ill not be possible. This implies to be mindful on libraries (that would read static files from there older), or automatic instrumentation (that hook `require`). Yet it comes with super small Docker images hat are fast to deploy.

We also have a very simple singleton-object dependency injection. This allows for simple retrieval of dependencies without imports (which avoids module mocking).

### Layers & folder structure

```
migrations         # database migrations (.sql files, no rollback)
src/
├── application    # service code
├── domain         # pure functions & TypeScript models of your entities
├── presentation   # communication layer (http)
├── repository     # storage of your entities
├── infrastructure # technical components (cache, database connection, etc.) — most of it should be outsourced to a shared SDK library
├── helpers        # utilities functions & non-domain code
└── test-helpers   # test utilities (starting default port, resetting database, etc.)
```

### Client generation

You can check [ts-rest's documentation](https://ts-rest.com/docs/core/fetch) to have an automatic client with typing. `routerContract` is exported on the index file.

### Node.js, npm version

TypeScript Service Starter relies on [Volta](https://volta.sh/) to ensure Node.js version to be consistent across developers. It's also used in the GitHub workflow file.

### TypeScript

Leverages [esbuild](https://github.com/evanw/esbuild) for blazing fast builds, but keeps `tsc` to generate `.d.ts` files.
Generates a single ESM build.

Commands:

- `build`: runs type checking then ESM and `d.ts` files in the `build/` directory
- `clean`: removes the `build/` directory
- `type:dts`: only generates `d.ts`
- `type:check`: only runs type checking
- `type:build`: only generates ESM

### Tests

TypeScript Library Starter uses [Node.js's native test runner](https://nodejs.org/api/test.html). Coverage is done using [c8](https://github.com/bcoe/c8) but will switch to Node.js's one once out.

Commands:

- `test`: runs test runner for both unit and integration tests
- `test:unit`: runs test runner for unit tests only
- `test:integration`: runs test runner for integration tests only
- `test:watch`: runs test runner in watch mode
- `test:coverage`: runs test runner and generates coverage reports

### Format & lint

This template relies on the combination of [ESLint](https://github.com/eslint/eslint) — through [Typescript-ESLint](https://github.com/typescript-eslint/typescript-eslint) for linting and [Prettier](https://github.com/prettier/prettier) for formatting.
It also uses [cspell](https://github.com/streetsidesoftware/cspell) to ensure correct spelling.

Commands:

- `format`: runs Prettier with automatic fixing
- `format:check`: runs Prettier without automatic fixing (used in CI)
- `lint`: runs ESLint with automatic fixing
- `lint:check`: runs ESLint without automatic fixing (used in CI)
- `spell:check`: runs spell checking

### Releasing

Under the hood, this service uses [semantic-release](https://github.com/semantic-release/semantic-release) and [Commitizen](https://github.com/commitizen/cz-cli).
The goal is to avoid manual release processes. Using `semantic-release` will automatically create a GitHub release (hence tags) as well as an npm release.
Based on your commit history, `semantic-release` will automatically create a patch, feature or breaking release.

Commands:

- `cz`: interactive CLI that helps you generate a proper git commit message, using [Commitizen](https://github.com/commitizen/cz-cli)
- `semantic-release`: triggers a release (used in CI)
