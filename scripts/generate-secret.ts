import { randomBytes } from "node:crypto";

if (import.meta.main) {
	const secret = randomBytes(32).toString("hex");

	console.log(secret);
}
