import z from "zod/v3";
import { PostPageDto } from "./dto/post-page.dto.js";

export namespace PostBelongWriter {
  export const PATH = "/writers";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export const QuerySchema = z.object({
    "last-id": z.coerce.bigint().optional(),
  });
  export type Query = z.infer<typeof QuerySchema>;

  export type Response = PostPageDto;
}
