import { type CommonQueryMethods, sql } from "slonik";

export async function up(tx: CommonQueryMethods) {
	await tx.any(
		sql.unsafe`
				create table if not exists users (
					id serial primary key,
					name text not null,
					email text not null
				);
			`,
	);
}

export async function down(tx: CommonQueryMethods) {
	await tx.any(
		sql.unsafe`
				drop table if exists users;
			`,
	);
}
