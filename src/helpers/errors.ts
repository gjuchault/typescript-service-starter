import type { SlonikError } from "slonik";

export interface SqlError {
	reason: "queryFailed";
	error: SlonikError;
}

export interface UnknownError {
	reason: "unknown";
	error: unknown;
}
