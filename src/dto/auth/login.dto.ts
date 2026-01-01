export interface LoginDto {
  username: string;
  password: string;
}

export function assertLoginDto(body: any): asserts body is LoginDto {
  if (
    typeof body !== "object" ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    throw new Error("INVALID_LOGIN_DTO");
  }
}
