export interface UpdatePasswordDto {
  originalPassword: string;
  newPassword: string;
}

export function assertUpdatePasswordDto(
  body: any
): asserts body is UpdatePasswordDto {
  if (
    typeof body !== "object" ||
    typeof body.originalPassword !== "string" ||
    typeof body.newPassword !== "string"
  ) {
    throw new Error("INVALID_PASSWORD_DTO");
  }
}
