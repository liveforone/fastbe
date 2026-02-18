import { Kysely } from "kysely";
import { Database } from "./schema.js";
import { withKyselyError } from "../errors/kysely.error.handler.js";
import { GlobalError } from "../errors/global.error.js";

export abstract class BaseRepository {
  constructor(protected readonly db: Kysely<Database>) {}

  /**
   * A `SELECT` statement that must return exactly one row.
   */
  protected async executeOne<T>(fn: () => Promise<T | undefined>): Promise<T> {
    return withKyselyError(async () => {
      const result = await fn();

      if (!result) {
        throw new GlobalError("RESOURCE_NOT_FOUND", 404);
      }

      return result;
    });
  }

  /**
   * A standard `SELECT` statement (returning zero rows is acceptable).
   * Example: pagination, search.
   */
  protected async executeQuery<T>(fn: () => Promise<T>): Promise<T> {
    return withKyselyError(fn);
  }

  /**
   * UPDATE / DELETE
   * The operation is considered successful only if at least one row is modified.
   */
  protected async executeMutation<
    T extends {
      numUpdatedRows?: bigint | number;
      numDeletedRows?: bigint | number;
    },
  >(fn: () => Promise<T>): Promise<T> {
    return withKyselyError(async () => {
      const result = await fn();

      const updated =
        result.numUpdatedRows !== undefined
          ? BigInt(result.numUpdatedRows)
          : undefined;

      const deleted =
        result.numDeletedRows !== undefined
          ? BigInt(result.numDeletedRows)
          : undefined;

      const affected = updated ?? deleted ?? 0n;

      if (affected === 0n) {
        throw new GlobalError("RESOURCE_NOT_FOUND", 404);
      }

      return result;
    });
  }
}
