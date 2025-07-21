import "temporal-polyfill/global";

export function databaseTimestampToInstant(
	input: string | Date | number,
): Temporal.Instant {
	if (typeof input === "number") {
		// assume a Java timestamp in milliseconds
		return Temporal.Instant.fromEpochMilliseconds(input);
	}

	if (input instanceof Date) {
		return Temporal.Instant.from(input.toISOString());
	}

	return Temporal.Instant.from(input);
}

export function instantToDatabaseTimestamp(input: Temporal.Instant): string {
	return input.toString();
}

export function isValidDatabaseTimestamp(
	input: string | Date | number,
): boolean {
	try {
		databaseTimestampToInstant(input);
		return true;
	} catch {
		return false;
	}
}
