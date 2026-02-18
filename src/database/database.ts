import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Database } from "./schema.js";

export function createDB(): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new Pool({
      database: "fastbe",
      host: "localhost",
      user: "postgres",
      port: 5432,
      password: "159624",
      max: 10,
    }),
  });

  return new Kysely<Database>({ dialect });
}
