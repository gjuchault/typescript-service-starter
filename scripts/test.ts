import { spawn } from "node:child_process";
import isMain from "is-main";
import { gen, unsafeFlowOrThrow } from "ts-flowgen";
import { initialSetup } from "../src/test-helpers/db-initial-setup.ts";

async function* runTests({
	nodeOptions = [],
	filesFilter = "",
	program = "node",
	programOptions = [],
	env = {},
}: {
	nodeOptions?: string[];
	filesFilter?: string;
	program?: string;
	programOptions?: string[];
	env?: Record<string, string>;
}): AsyncGenerator<unknown, void, unknown> {
	const time = Date.now();

	yield* initialSetup();

	return yield* gen<[], unknown, void>(
		() =>
			new Promise((resolve, reject) => {
				const options = [
					...programOptions,
					"--disable-warning=ExperimentalWarning",
					"--env-file=.env",
					"--env-file-if-exists=.env.local",
					"--test",
					...nodeOptions,
					filesFilter !== "" ? filesFilter : "src/**/*.test.ts",
				];

				const envStr = Object.entries(env)
					.map(([key, value]) => `${key}=${value}`)
					.join(" ");

				console.log(`${envStr} ${program} ${options.join(" ")}`);
				const nodeProcess = spawn(program, options, {
					stdio: "inherit",
					env: { ...process.env, ...env },
				});

				nodeProcess.on("close", (code) => {
					if (code === 0) {
						console.log(`🚀 ran tests in ${Date.now() - time}ms`);

						resolve(undefined);
					}

					reject(`🚨 tests failed with code ${code} in ${Date.now() - time}ms`);
				});
			}),
	)();
}

if (isMain(import.meta)) {
	const filesFilter = process.argv.slice(3).join(" ").trim();

	if (process.argv[2] === "test") {
		await unsafeFlowOrThrow(() => runTests({ filesFilter }));
	}

	if (process.argv[2] === "test:inspect") {
		await unsafeFlowOrThrow(() =>
			runTests({
				nodeOptions: ["--inspect"],
				filesFilter,
			}),
		);
	}

	if (process.argv[2] === "test:watch") {
		await unsafeFlowOrThrow(() =>
			runTests({
				nodeOptions: ["--watch"],
				filesFilter,
			}),
		);
	}

	if (process.argv[2] === "test:coverage") {
		await unsafeFlowOrThrow(() =>
			runTests({
				nodeOptions: ["--experimental-test-coverage"],
				program: "c8",
				programOptions: ["-r", "html", "node"],
				env: {
					NODE_V8_COVERAGE: "./coverage",
				},
			}),
		);
	}
}
