export interface CreatePostDto {
  title: string;
  content: string;
}

export function assertCreatePostDto(body: any): asserts body is CreatePostDto {
  if (
    typeof body !== "object" ||
    typeof body.title !== "string" ||
    typeof body.content !== "string"
  ) {
    throw new Error("INVALID_CREATE_POST_DTO");
  }
}
