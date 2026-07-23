import z from "zod/v3";
import { PostDetailDto } from "./dto/post-detail.dto.js";

export namespace PostDetail {
  export const PATH = "/:id";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export const ParamsSchema = z.object({
    id: z.coerce.bigint(),
  });
  export type Params = z.infer<typeof ParamsSchema>;

  export interface Response {
    readonly ok: boolean;
    readonly postDetailDto: PostDetailDto;
  }
}
