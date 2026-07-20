import { GlobalError } from "../../errors/global.error.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { Signup } from "../api/signup.api.js";
import { Login } from "../api/login.api.js";
import { UpdatePassword } from "../api/update-password.api.js";
import { UsersRepository } from "../repository/users.repository.js";
import { Users } from "../../database/schema.js";
import { hashPassword, verifyPassword } from "../../util/password.util.js";

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  private refreshKey = (id: string) => `refresh:${id}`;

  async signup(signupRequest: Signup.Request): Promise<Users> {
    const { username, password } = signupRequest;
    const hashedPassword = await hashPassword(password);

    const signupDto = { username, hashedPassword };
    const user = await this.usersRepository.saveUsers(signupDto);
    logger.info(`User was created. Username : ${signupDto.username}`);
    return user;
  }

  async login(loginDto: Login.Request): Promise<Users> {
    const { username, password } = loginDto;
    const user = await this.usersRepository.findUsersByUsername(username);
    await verifyPassword(password, user.password);
    return user;
  }

  async saveRefreshToken(id: string, refreshToken: string) {
    await redis.set(this.refreshKey(id), refreshToken, "EX", 7 * 24 * 60 * 60);
  }

  async validRefreshToken(id: string, refreshToken: string) {
    const savedRefreshToken = await redis.get(this.refreshKey(id));

    if (savedRefreshToken !== refreshToken) {
      await redis.del(this.refreshKey(id));

      const errorMsg = "INVALID_REFRESH_TOKEN";
      logger.error(`Valid Refresh Token occurs Error. Casue : ${errorMsg}`);
      throw new GlobalError(errorMsg, 401);
    }
  }

  async getUsersById(id: string): Promise<Users> {
    return await this.usersRepository.findUsersById(id);
  }

  async removeRefreshToken(id: string) {
    await redis.del(this.refreshKey(id));
  }

  async updatePassword(updatePasswordDto: UpdatePassword.Request, id: string) {
    const { originalPassword, newPassword } = updatePasswordDto;
    const hashedPassword = await this.usersRepository.findPasswordById(id);
    await verifyPassword(originalPassword, hashedPassword.password);

    const hashedNewPassword = await hashPassword(newPassword);
    await this.usersRepository.updatePasswordById(id, hashedNewPassword);

    await redis.del(this.refreshKey(id));
  }
}
