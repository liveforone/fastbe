import { logger } from "../config/logger.js";
import { GlobalError } from "./global.error.js";
import { DBErrorCode } from "./database/db-error.enum.js";
import { DBErrorStatusMap } from "./database/db-error.map.js";

function throwDBError(code: DBErrorCode): never {
  const status = DBErrorStatusMap[code];
  throw new GlobalError(code, status);
}

function mapPostgresError(error: any): never {
  const pgCode: string | undefined = error?.code;

  if (!pgCode) {
    logger.error(error);
    throwDBError(DBErrorCode.DATABASE_ERROR);
  }

  const errorClass = pgCode.substring(0, 2);

  // ======================
  // Specific PostgreSQL codes
  // ======================

  switch (pgCode) {
    case "23505":
      throwDBError(DBErrorCode.DUPLICATE_RESOURCE);

    case "23503":
      throwDBError(DBErrorCode.FOREIGN_KEY_VIOLATION);

    case "23502":
      throwDBError(DBErrorCode.NOT_NULL_VIOLATION);

    case "23514":
      throwDBError(DBErrorCode.CHECK_CONSTRAINT_VIOLATION);

    case "22P02":
      throwDBError(DBErrorCode.INVALID_INPUT_SYNTAX);

    case "40001":
      throwDBError(DBErrorCode.SERIALIZATION_FAILURE);

    case "40P01":
      throwDBError(DBErrorCode.DEADLOCK_DETECTED);
  }

  // ======================
  // Class-level fallback
  // ======================

  switch (errorClass) {
    case "22":
      throwDBError(DBErrorCode.DATA_EXCEPTION);

    case "23":
      throwDBError(DBErrorCode.INTEGRITY_CONSTRAINT_VIOLATION);

    case "28":
      throwDBError(DBErrorCode.INVALID_AUTHORIZATION);

    case "40":
      throwDBError(DBErrorCode.TRANSACTION_ROLLBACK);

    case "42":
      throwDBError(DBErrorCode.SYNTAX_ERROR);

    case "53":
      throwDBError(DBErrorCode.INSUFFICIENT_RESOURCES);

    case "57":
      throwDBError(DBErrorCode.OPERATOR_INTERVENTION);

    case "58":
      throwDBError(DBErrorCode.SYSTEM_ERROR);
  }

  // ======================
  // Kysely executeTakeFirstOrThrow
  // ======================

  if (error.message?.includes("no result")) {
    throwDBError(DBErrorCode.RESOURCE_NOT_FOUND);
  }

  logger.error(error);
  throwDBError(DBErrorCode.DATABASE_ERROR);
}

export async function withKyselyError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error instanceof GlobalError) {
      throw error;
    }

    mapPostgresError(error);
  }
}
