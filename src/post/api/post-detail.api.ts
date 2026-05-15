import { PostDetailDto } from "./dto/post-detail.dto.js";

export namespace PostDetail {
  export const PATH = "/:id";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export interface Response {
    readonly ok: boolean;
    readonly postDetailDto: PostDetailDto;
  }
}
