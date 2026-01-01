import { AuthService } from "../services/auth.service.js";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { SignupDto } from "../dto/auth/signup.dto.js";
import { LoginDto } from "../dto/auth/login.dto.js";
import { UpdatePasswordDto } from "../dto/auth/updatePassword.dto.js";
import { CustomError } from "../errors/custom.error.js";

describe("AuthService Unit Test(Real DB / Redis)", () => {
  beforeEach(async () => {
    await prisma.users.deleteMany();
    await redis.flushall();
  });

  afterAll(async () => {
    await prisma.users.deleteMany();
    await redis.flushall();
    await prisma.$disconnect();
    await redis.quit();
  });

  it("Signup Test [Success]", async () => {
    const username = "signup_test";
    const password = "test";
    const signupDto: SignupDto = { username: username, password: password };

    await AuthService.signup(signupDto);

    const user = await AuthService.getUsersByUsername(username);
    expect(user).not.toBeNull();
    expect(user!.username).toBe(username);
    expect(await bcrypt.compare(password, user.password)).toBeTruthy();
  });

  // it("Signup Test [Fail - Duplicate Username]", async () => {
  //   const username = "signup_fail_test";
  //   const password = "signup_fail_test_password";
  //   const signupDto: SignupDto = { username: username, password: password };
  //   await AuthService.signup(signupDto);

  //   await expect(AuthService.signup(signupDto)).rejects.toBe(
  //     new CustomError(
  //       "[P2002] The unique constraint for this operation has failed because a record with the same key already exists in the database. This means that the operation you are trying to perform violates a uniqueness constraint defined on one or more columns. Please review the data being inserted or updated to ensure that it does not duplicate existing keys.",
  //       409
  //     )
  //   );
  // });

  it("Login Test [Success]", async () => {
    const username = "login_test";
    const password = "login_test_password";
    const signupDto: SignupDto = { username: username, password: password };
    await AuthService.signup(signupDto);

    const loginDto: LoginDto = { username: username, password: password };
    const user = await AuthService.login(loginDto);

    expect(user.username).toBe(username);
  });

  it("Login Test [Fail - Wrong Password]", async () => {
    const username = "login_fail_test";
    const password = "login_fail_test_password";
    const signupDto: SignupDto = { username: username, password: password };
    await AuthService.signup(signupDto);

    const wrongPassword = "wrong_password";
    const loginDto: LoginDto = { username: username, password: wrongPassword };
    await expect(AuthService.login(loginDto)).rejects.toThrow("Wrong Password");
  });

  it("UpdatePassword Test [Success]", async () => {
    const username = "update_password_test";
    const password = "update_password_test_password";
    const signupDto: SignupDto = { username: username, password: password };
    await AuthService.signup(signupDto);

    const newPassword = "new_password";
    const updatePasswordDto: UpdatePasswordDto = {
      originalPassword: password,
      newPassword,
    };
    await AuthService.updatePassword(updatePasswordDto, username);

    const loginDto: LoginDto = { username: username, password: newPassword };
    const user = await AuthService.login(loginDto);
    expect(user.username).toBe(username);
  });

  it("UpdatePassword Test [Fail - Wrong Password]", async () => {
    const username = "update_password_fail_test";
    const password = "update_password_fail_test_password";
    const signupDto: SignupDto = { username: username, password: password };
    await AuthService.signup(signupDto);

    const wrongPassword = "wrong_password";
    const newPassword = "new_password";
    const updatePasswordDto: UpdatePasswordDto = {
      originalPassword: wrongPassword,
      newPassword: newPassword,
    };
    await expect(
      AuthService.updatePassword(updatePasswordDto, username)
    ).rejects.toThrow("Wrong Password");
  });
});
