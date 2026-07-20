import { randomUUID } from "node:crypto";
import { BaseRepository } from "../../database/base.repository.js";

export class UsersRepository extends BaseRepository {
  async saveUsers(signupDto: { username: string; hashedPassword: string }) {
    const { username, hashedPassword } = signupDto;
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
