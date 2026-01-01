export interface SignupDto {
  username: string;
  password: string;
}

export function assertSignupDto(body: any): asserts body is SignupDto {
  if (
    typeof body !== "object" ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    throw new Error("INVALID_SIGNUP_DTO");
  }
}
