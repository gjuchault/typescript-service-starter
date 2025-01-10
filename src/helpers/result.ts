export type Err<_, E> = { readonly ok: false; readonly error: E };
export type Ok<T, _> = { readonly ok: true; readonly value: T };

export type GetOk<T> = T extends Ok<infer R, infer _> ? R : never;
export type GetErr<T> = T extends Err<infer _, infer R> ? R : never;

export type Result<T, E> = Ok<T, E> | Err<T, E>;

type IsNever<T> = [T] extends [never] ? true : false;
export type ExtendResult<R, E2 = never, T2 = never> = R extends Result<
	infer T,
	infer E
>
	? IsNever<T2> extends true
		? Result<T, E | E2>
		: Result<T2, E | E2>
	: never;

export function ok<T, E = never>(value: T): Ok<T, E> {
	return { ok: true, value };
}

export function err<T = never, E = unknown>(error: E): Err<T, E> {
	return { ok: false, error };
}
