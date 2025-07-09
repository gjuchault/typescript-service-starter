import { randomBytes } from "node:crypto";
import { isMain } from "is-main";

if (isMain(import.meta)) {
	const secret = randomBytes(32).toString("hex");

	console.log(secret);
}
