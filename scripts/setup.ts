import childProcess from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { isMain } from "is-main";
import prompts from "prompts";
import slugify from "slugify";

const exec = promisify(childProcess.exec);

const rootPath = process.cwd();
const releaseRcPath = path.join(rootPath, ".releaserc.json");
const cspellPath = path.join(rootPath, ".cspell.json");
const packageJsonPath = path.join(rootPath, "package.json");
const dockerComposePath = path.join(rootPath, "docker-compose.yml");
const contributingPath = path.join(rootPath, "CONTRIBUTING.md");
const dbInitialSetupPath = path.join(
	rootPath,
	"src/test-helpers/db-initial-setup.ts",
);
const setupPath = path.join(rootPath, "scripts/setup.ts");
const testSetupPath = path.join(rootPath, "scripts/test-setup.ts");
const workflowPath = path.join(
	rootPath,
	".github/workflows/typescript-service-starter.yml",
);
const issueConfigPath = path.join(
	rootPath,
	".github/ISSUE_TEMPLATE/config.yml",
);
const codeOfConductPath = path.join(rootPath, "CODE_OF_CONDUCT.md");

interface Input {
	packageName: string;
	githubUserName: string;
	userMail: string;
}

async function setup() {
	const initialProjectName = path.basename(rootPath);

	const input: Input = await prompts([
		{
			type: "text",
			name: "packageName",
			message: "What is your project name?",
			initial: initialProjectName,
		},
		{
			type: "text",
			name: "githubUserName",
			message: "What is your github username (package.json)?",
		},
		{
			type: "text",
			name: "userMail",
			message: "What is your mail (CODE_OF_CONDUCT.md)?",
		},
	]);

	// \u0015 may be inserted by clearing the pre-filled value by doing
	// cmd+backspace
	const packageName = input.packageName?.trim().replace("\u0015", "");
	const githubUserName = input.githubUserName?.trim();
	const userMail = input.userMail?.trim();

	if (!(packageName !== "" && githubUserName !== "")) {
		// biome-ignore lint/suspicious/noConsole: script
		// biome-ignore lint/suspicious/noConsoleLog: script
		console.log("User input missing. Exiting");
		process.exit(1);
	}

	return run({ packageName, githubUserName, userMail });
}

export async function run({
	packageName,
	githubUserName,
	userMail,
}: {
	packageName: string;
	githubUserName: string;
	userMail: string;
}) {
	await applyPackageName({ packageName, githubUserName, userMail });

	await cleanup({ packageName });

	await commitAll("chore: typescript-service-starter");

	// biome-ignore lint/suspicious/noConsole: script
	// biome-ignore lint/suspicious/noConsoleLog: script
	console.log("Ready to go 🚀");
}

const workflowNameRegexp = /Typescript Service Starter/;
const workflowSlugRegexp = /typescript-service-starter/;
const workflowTestSetupRegexp = /, test-setup/i;
const descriptionRegexp = /[^\n]+"description[^\n]+\n/;
const keywordsRegexp = /[^\n]+"keywords[^\]]+\],\n/;
const homepageRegexp = /[^\n]+"homepage[^\n]+\n/;
const bugsRegexp = /[^\n]+"bugs[^\n]+\n/;
const authorRegexp =
	/[^\n]+"author[^\n]+\n[^\n]+"name[^\n]+\n[^\n]+"email[^\n]+\n[^\n]+\}[^\n]+\n/;
const repositoryRegexp = /[^\n]+"repository[^\n]+\n/;
const setupRegexp = /[^\n]+"setup[^\n]+\n/;
async function applyPackageName({
	packageName,
	githubUserName,
	userMail,
}: {
	packageName: string;
	githubUserName: string;
	userMail: string;
}) {
	const packageSlug = slugify(packageName);

	const setupAction = `  test-setup:
    name: ⚡ Setup tests
    runs-on: ubuntu-latest
    needs: [dependencies]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: package.json
          cache: "npm"
      - run: npm ci
      - name: ⚡ Tests
        run: node --run test:setup\n\n`;

	await logAsyncTask(
		"Changing GitHub workflow file",
		replaceInFile(
			workflowPath,
			new Map<RegExp | string, string>([
				[workflowNameRegexp, packageName],
				[workflowSlugRegexp, packageSlug],
				[setupAction, ""],
				[workflowTestSetupRegexp, ""],
			]),
		),
	);

	await logAsyncTask(
		"Changing GitHub Discussions file",
		replaceInFile(
			issueConfigPath,
			new Map([
				[
					"gjuchault/typescript-service-starter",
					`${githubUserName}/${packageName}`,
				],
			]),
		),
	);

	await logAsyncTask(
		"Changing CONTRIBUTING.md file",
		replaceInFile(
			contributingPath,
			new Map([
				[
					/gjuchault\/typescript-service-starter/g,
					`${githubUserName}/${packageName}`,
				],
			]),
		),
	);

	await logAsyncTask(
		"Renaming GitHub workflow file",
		fs.rename(
			workflowPath,
			path.join(rootPath, `.github/workflows/${packageName}.yml`),
		),
	);

	await logAsyncTask(
		"Editing .releaserc.json",
		replaceInFile(
			releaseRcPath,
			new Map([
				[
					"gjuchault/typescript-service-starter",
					`${githubUserName}/${packageName}`,
				],
			]),
		),
	);

	await logAsyncTask(
		"Editing CODE_OF_CONDUCT.md",
		replaceInFile(
			codeOfConductPath,
			new Map([["gabriel.juchault@gmail.com", userMail]]),
		),
	);

	await logAsyncTask(
		"Editing docker-compose.yml",
		replaceInFile(
			dockerComposePath,
			new Map([["typescript-service-starter", packageName]]),
		),
	);

	await logAsyncTask(
		"Editing db-initial-setup.ts",
		replaceInFile(
			dbInitialSetupPath,
			new Map([["typescript-service-starter", packageName]]),
		),
	);

	await logAsyncTask(
		"Editing package.json",

		replaceInFile(
			packageJsonPath,
			new Map<string | RegExp, string>([
				["@gjuchault/typescript-service-starter", packageName],
				[descriptionRegexp, ""],
				[keywordsRegexp, ""],
				[homepageRegexp, ""],
				[bugsRegexp, ""],
				[authorRegexp, ""],
				[repositoryRegexp, ""],
				[setupRegexp, ""],
			]),
		),
	);
}

async function cleanup({ packageName }: { packageName: string }) {
	await logAsyncTask(
		"Removing dependencies",
		exec("npm uninstall slugify prompts"),
	);

	await logAsyncTask(
		"Cleaning cspell",
		replaceInFile(cspellPath, new Map([["gjuchault", packageName]])),
	);

	await logAsyncTask("Removing setup.ts script", fs.rm(setupPath));
	await logAsyncTask("Removing test-setup.ts script", fs.rm(testSetupPath));
}

async function replaceInFile(
	filePath: string,
	replacers: Map<string | RegExp, string>,
) {
	const fileContent = await fs.readFile(filePath, "utf8");

	let replacedContent = fileContent;
	for (const [searchFor, replaceBy] of replacers) {
		replacedContent = replacedContent.replace(searchFor, replaceBy);
	}

	await fs.writeFile(filePath, replacedContent);
}

async function commitAll(message: string) {
	await exec("git add .");
	await logAsyncTask(
		`Committing changes: ${message}`,
		exec(`git commit -m "${message}"`),
	);
}

async function logAsyncTask<Resolve>(
	message: string,
	promise: Promise<Resolve>,
) {
	process.stdout.write(message);

	const output = await promise;

	// biome-ignore lint/suspicious/noConsole: script
	// biome-ignore lint/suspicious/noConsoleLog: script
	console.log(" ✅");

	return output;
}

if (isMain(import.meta)) {
	await setup();
}
