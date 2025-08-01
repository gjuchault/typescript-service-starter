export type NonEmptyArray<T> = [T, ...T[]];

export function toNonEmptyArray<T>(
	input: readonly [T, ...T[]],
): NonEmptyArray<T>;
export function toNonEmptyArray<T>(
	input: readonly T[],
): NonEmptyArray<T> | undefined;
export function toNonEmptyArray<T>(
	input: readonly T[],
): NonEmptyArray<T> | undefined {
	return isNonEmptyArray(input) ? (input as NonEmptyArray<T>) : undefined;
}

export function isNonEmptyArray<T>(
	input: T[] | readonly T[],
): input is NonEmptyArray<T> {
	return input.length > 0;
}

/**
 * Combines two or more arrays.
 * This method returns a new array without modifying any existing arrays.
 * @param items Additional arrays and/or items to add to the end of the array.
 */
export function concat<T>(
	...items: [NonEmptyArray<T>, ...T[][]]
): NonEmptyArray<T> {
	const result: T[] = [];

	for (const item of items) {
		result.push(...item);
	}

	return result as NonEmptyArray<T>;
}

/**
 * Returns the elements of an array that meet the condition specified in a callback function.
 * @param input The input array
 * @param predicate A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.
 */
export function filter<T>(
	input: NonEmptyArray<T>,
	predicate: (value: T, index: number, array: T[]) => boolean,
): NonEmptyArray<T> | undefined {
	return toNonEmptyArray(
		input.filter((value, index, array) => predicate(value, index, array)),
	);
}

/**
 * Returns a new array with all sub-array elements concatenated into it recursively up to the
 * specified depth.
 *
 * @param input The input array
 * @param depth The maximum recursion depth
 */
export function flat<T>(
	input: NonEmptyArray<T>,
	depth?: number,
): NonEmptyArray<T> {
	return input.flat(depth) as NonEmptyArray<T>;
}

/**
 * Calls a defined callback function on each element of an array. Then, flattens the result into
 * a new array.
 * This is identical to a map followed by flat with depth 1.
 *
 * @param input The input array
 * @param callback A function that accepts up to three arguments. The flatMap method calls the
 * callback function one time for each element in the array.
 */
export function flatMap<T, U>(
	input: NonEmptyArray<T>,
	predicate: (value: T, index: number, array: T[]) => U | readonly U[],
): NonEmptyArray<U> {
	return input.flatMap((value, index, array) =>
		predicate(value, index, array),
	) as NonEmptyArray<U>;
}

/**
 * Calls a defined callback function on each element of an array, and returns an array that contains the results.
 * @param input The input array
 * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
 */
export function map<T, U>(
	input: NonEmptyArray<T>,
	predicate: (value: T, index: number, array: T[]) => U,
): NonEmptyArray<U> {
	return input.map((value, index, number) =>
		predicate(value, index, number),
	) as NonEmptyArray<U>;
}

/**
 * Reverses the elements in an array in place.
 * This method mutates the array and returns a reference to the same array.
 * @param input The input array
 */
export function reverse<T>(input: NonEmptyArray<T>): NonEmptyArray<T> {
	return input.reverse() as NonEmptyArray<T>;
}
/**
 * Returns a copy of a section of an array.
 * For both start and end, a negative index can be used to indicate an offset from the end of the array.
 * For example, -2 refers to the second to last element of the array.
 * @param input The input array
 * @param start The beginning index of the specified portion of the array.
 * If start is undefined, then the slice begins at index 0.
 * @param end The end index of the specified portion of the array. This is exclusive of the element at the index 'end'.
 * If end is undefined, then the slice extends to the end of the array.
 */
export function slice<T>(
	input: NonEmptyArray<T>,
	start?: number,
	end?: number,
): NonEmptyArray<T> | undefined {
	return toNonEmptyArray(input.slice(start, end));
}
