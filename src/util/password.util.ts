import bcrypt from "bcrypt";
import { GlobalError } from "../errors/global.error.js";

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<void> {
  const valid = await bcrypt.compare(plain, hashed);
  if (!valid) {
    const errorMsg = "INVALID_PASSWORD";
    throw new GlobalError(errorMsg, 401);
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
