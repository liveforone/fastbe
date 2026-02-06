import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { CustomError } from "../errors/custom.error.js";
import { redis } from "../config/redis.js";
import { users } from "../../generated/prisma/client.js";
import { logger } from "../config/logger.js";
import { withPrismaError } from "../errors/prismaError.handle.js";
import { Signup } from "../api/auth/signup.api.js";
import { Login } from "../api/auth/login.api.js";
import { UpdatePassword } from "../api/auth/update-password.api.js";

export class AuthService {
  static async signup(signupDto: Signup.Request): Promise<users> {
    const { username, password } = signupDto;
    const hashedPassword = await this.hashPassword(password);

    const user = await withPrismaError(() =>
      prisma.users.create({ data: { username, password: hashedPassword } }),
    );
    logger.info(`User was created. Username : ${username}`);

    return user;
  }

  static async login(loginDto: Login.Request): Promise<users> {
    const { username, password } = loginDto;
    const user = await withPrismaError(() =>
      prisma.users.findUniqueOrThrow({
        where: { username: username },
      }),
    );
    await this.verifyPassword(password, user.password);
    return user;
  }

  static async saveRefreshToken(id: string, refreshToken: string) {
    await redis.set(`refresh:${id}`, refreshToken, "EX", 7 * 24 * 60 * 60);
  }

  static async validRefreshToken(id: string, refreshToken: string) {
    const savedRefreshToken = await redis.get(`refresh:${id}`);

    if (savedRefreshToken !== refreshToken) {
      await redis.del(`refresh:${id}`);

      const errorMsg = "Mismatch Refresh Token";
      logger.error(`Valid Refresh Token occurs Error. Casue : ${errorMsg}`);
      throw new CustomError(errorMsg, 401);
    }
  }

  static async getUsersById(id: string): Promise<users> {
    return await withPrismaError(() =>
      prisma.users.findUniqueOrThrow({
        where: { id: id },
      }),
    );
  }

  static async removeRefreshToken(id: string) {
    await redis.del(`refresh:${id}`);
  }

  static async updatePassword(
    updatePasswordDto: UpdatePassword.Request,
    id: string,
  ) {
    const { originalPassword, newPassword } = updatePasswordDto;
    const hashedPassword = await withPrismaError(() =>
      prisma.users.findUniqueOrThrow({
        select: { password: true },
        where: { id: id },
      }),
    );
    await this.verifyPassword(originalPassword, hashedPassword.password);

    const hashedNewPassword = await this.hashPassword(newPassword);
    await withPrismaError(() =>
      prisma.users.update({
        where: { id: id },
        data: { password: hashedNewPassword },
      }),
    );

    await redis.del(`refresh:${id}`);
  }

  private static async verifyPassword(
    plain: string,
    hashed: string,
  ): Promise<void> {
    const valid = await bcrypt.compare(plain, hashed);
    if (!valid) {
      const errorMsg = "Wrong Password";
      logger.error(`Verify Password occurs Error. Cause : ${errorMsg}`);
      throw new CustomError(errorMsg, 401);
    }
  }

  private static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}
