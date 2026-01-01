import { findPrismaErrorInfo } from "prisma-common-error-handle";
import { CustomError } from "./custom.error.js";
import { logger } from "../config/logger.js";

export async function withPrismaError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const { message, status } = findPrismaErrorInfo(error);
    logger.error(`Prisma Error Status : ${status}`);
    throw new CustomError(message, status);
  }
}
