export interface UpdatePostDto {
  title: string;
  content: string;
}

export function assertUpdatePostDto(body: any): asserts body is UpdatePostDto {
  if (
    typeof body !== "object" ||
    typeof body.title !== "string" ||
    typeof body.content !== "string"
  ) {
    throw new Error("INVALID_UPDATE_POST_DTO");
  }
}
