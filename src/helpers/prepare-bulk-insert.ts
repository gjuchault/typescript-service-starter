import {
	type ListSqlToken,
	type PrimitiveValueExpression,
	sql,
	type UnnestSqlToken,
} from "slonik";
import * as z from "zod";
import type { JsonValue } from "./json-type.ts";
import {
	databaseTimestampToInstant,
	instantToDatabaseTimestamp,
	isValidDatabaseTimestamp,
} from "./temporal.ts";

// Similar to slonik's TypeNameIdentifier without string
type TypeNameIdentifier =
	| "bool"
	| "bytea"
	| "float4"
	| "float8"
	| "int2"
	| "int4"
	| "int8"
	| "json"
	| "text"
	| "timestamptz"
	| "uuid";

export type ColumnDefinition<Entity> = [keyof Entity, TypeNameIdentifier];

type LaxPrimitive = PrimitiveValueExpression | JsonValue | Date;

/**
 * create columns and rows data for slonik bulk insert that are efficient and type-safe
 * @example
 * const { columns, rows } = prepareBulkInsert(
 *   [
 *     ["id", "int4"],
 *     ["name", "text"]
 *   ],
 *   [ \{ id: 1, name: "foo" \}, \{ id: 2, name: "bar" \} ],
 *   record =\> (\{ ...record \})
 * )
 *
 * await connection.query(sql.unsafe\`
 *   insert into "table"($\{columns\})
 *   select * from $\{rows\}
 * \`);
 * @param columnDefinitions - tuple array of the records keys and their postgres type
 * @param records - records to insert
 * @param iteratee - map method on every record to match the database shape
 */
export function prepareBulkInsert<
	DatabaseRecord extends Record<string, LaxPrimitive>,
	Entity,
>(
	columnDefinitions: ColumnDefinition<DatabaseRecord>[],
	records: Entity[],
	iteratee: (record: Entity, i: number) => DatabaseRecord,
): { columns: ListSqlToken; rows: UnnestSqlToken } {
	const headers = z
		.array(z.string())
		.parse(columnDefinitions.map(([columnName]) => columnName));

	const columnTypes = columnDefinitions.map(
		(columnDefinition) => columnDefinition[1],
	);

	const rows: LaxPrimitive[][] = [];

	for (const [i, record] of records.entries()) {
		const databaseRecord = iteratee(record, i);

		const columns: LaxPrimitive[] = [];

		for (const [columnName, columnType] of columnDefinitions) {
			if (columnType === "json") {
				columns.push(JSON.stringify(databaseRecord[columnName]));
				continue;
			}

			if (columnType === "timestamptz") {
				const date = z
					.union([z.date(), z.number(), z.string()])
					.refine(isValidDatabaseTimestamp)
					.parse(databaseRecord[columnName]);

				columns.push(
					instantToDatabaseTimestamp(databaseTimestampToInstant(date)),
				);
				continue;
			}

			const column = databaseRecord[columnName];
			if (column !== undefined) {
				columns.push(column);
			}
		}

		rows.push(columns);
	}

	const columns = sql.join(
		headers.map((header) => sql.identifier([header])),
		sql.fragment`, `,
	);

	return {
		columns,
		rows: sql.unnest(rows, columnTypes),
	};
}
