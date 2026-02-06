import { PostPageDto } from "./dto/postPage.dto.js";

export namespace PostHome {
  export const PATH = "/";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export type Response = PostPageDto;
}
