import { PostPageDto } from "./dto/postPage.dto.js";

export namespace PostBelongWriter {
  export const PATH = "/writers";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export type Response = PostPageDto;
}
