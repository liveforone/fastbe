import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Database } from "./schema.js";
import { logger } from "../config/logger.js";

export function createDB(): Kysely<Database> {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
      }),
    }),

    log(event) {
      if (event.level === "query") {
        logger.info(
          {
            sql: event.query.sql,
            params: event.query.parameters,
            duration: event.queryDurationMillis,
          },
          "kysely query",
        );
      }

      if (event.level === "error") {
        logger.error(event.error);
      }
    },
  });

  return db;
}
