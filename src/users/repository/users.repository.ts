import { randomUUID } from "node:crypto";
import { hashPassword } from "../../util/password.util.js";
import { Signup } from "../api/signup.api.js";
import { withKyselyError } from "../../errors/kysely.error.handler.js";
import { BaseRepository } from "../../database/base.repository.js";

export class UsersRepository extends BaseRepository {
  async saveUsers(signupDto: Signup.Request) {
    const { username, password } = signupDto;
    const hashedPassword = await hashPassword(password);
    return this.executeOne(() =>
      this.db
        .insertInto("users")
        .values({
          id: randomUUID(),
          username: username,
          password: hashedPassword,
          role: "MEMBER",
        })
        .returningAll()
        .executeTakeFirst(),
    );
  }

  async findUsersByUsername(username: string) {
    return this.executeOne(() =>
      this.db
        .selectFrom("users")
        .where("username", "=", username)
        .selectAll()
        .executeTakeFirst(),
    );
  }

  async findUsersById(id: string) {
    return this.executeOne(() =>
      this.db
        .selectFrom("users")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirst(),
    );
  }

  async findPasswordById(id: string) {
    return this.executeOne(() =>
      this.db
        .selectFrom("users")
        .where("id", "=", id)
        .select("password")
        .executeTakeFirst(),
    );
  }

  async updatePasswordById(id: string, newPassword: string) {
    return this.executeMutation(() =>
      this.db
        .updateTable("users")
        .set("password", newPassword)
        .where("id", "=", id)
        .executeTakeFirst(),
    );
  }
}
