const optionSymbol = Symbol("option");

export type Some<T> = T & { [optionSymbol]: "some" };
export type None = undefined & { [optionSymbol]: "none" };

export type Option<T> = Some<T> | None;

export function some<T>(value: T): Some<T> {
	return value as Some<T>;
}

export function none(): None {
	return undefined as None;
}
