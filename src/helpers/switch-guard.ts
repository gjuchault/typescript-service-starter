export function switchGuard(input: never, cause: unknown): never {
	throw new Error(`Unexpected value: ${input}`, {
		cause,
	});
}
