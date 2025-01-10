import { randomBytes } from "node:crypto";
import { isMain } from "is-main";

if (isMain(import.meta)) {
	const secret = randomBytes(32).toString("hex");

	// biome-ignore lint/suspicious/noConsoleLog: script
	// biome-ignore lint/suspicious/noConsole: script
	console.log(secret);
}
