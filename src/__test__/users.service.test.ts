import { UsersService } from "../users/service/users.service.js";
import bcrypt from "bcrypt";
import { redis } from "../config/redis.js";
import { Signup } from "../users/api/signup.api.js";
import { Login } from "../users/api/login.api.js";
import { UpdatePassword } from "../users/api/update-password.api.js";
import { createDB } from "../database/database.js";
import { UsersRepository } from "../users/repository/users.repository.js";

describe("AuthService Unit Test(Real DB / Redis)", () => {
  const db = createDB();
  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);

  beforeEach(async () => {
    await db.deleteFrom("users").execute();
    await redis.flushall();
  });

  afterAll(async () => {
    await db.deleteFrom("users").execute();
    await redis.flushall();
    await redis.quit();
  });

  it("Signup Test [Success]", async () => {
    const username = "signup_test";
    const password = "test";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };

    const user = await usersService.signup(signupDto);

    expect(user).not.toBeNull();
    expect(user!.username).toBe(username);
    expect(await bcrypt.compare(password, user.password)).toBeTruthy();
  });

  it("Login Test [Success]", async () => {
    const username = "login_test";
    const password = "login_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    await usersService.signup(signupDto);

    const loginDto: Login.Request = { username: username, password: password };
    const user = await usersService.login(loginDto);

    expect(user.username).toBe(username);
  });

  it("Login Test [Fail - Wrong Password]", async () => {
    const username = "login_fail_test";
    const password = "login_fail_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    await usersService.signup(signupDto);

    const wrongPassword = "wrong_password";
    const loginDto: Login.Request = {
      username: username,
      password: wrongPassword,
    };
    await expect(usersService.login(loginDto)).rejects.toThrow(
      "Wrong Password",
    );
  });

  it("UpdatePassword Test [Success]", async () => {
    const username = "update_password_test";
    const password = "update_password_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    const user = await usersService.signup(signupDto);

    const newPassword = "new_password";
    const updatePasswordDto: UpdatePassword.Request = {
      originalPassword: password,
      newPassword,
    };
    await usersService.updatePassword(updatePasswordDto, user.id);

    const loginDto: Login.Request = {
      username: username,
      password: newPassword,
    };
    const foundUser = await usersService.login(loginDto);
    expect(foundUser.username).toBe(username);
  });

  it("UpdatePassword Test [Fail - Wrong Password]", async () => {
    const username = "update_password_fail_test";
    const password = "update_password_fail_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    const user = await usersService.signup(signupDto);

    const wrongPassword = "wrong_password";
    const newPassword = "new_password";
    const updatePasswordDto: UpdatePassword.Request = {
      originalPassword: wrongPassword,
      newPassword: newPassword,
    };
    await expect(
      usersService.updatePassword(updatePasswordDto, user.id),
    ).rejects.toThrow("Wrong Password");
  });
});
