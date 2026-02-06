import { $Enums } from "../../../generated/prisma/client.js";

export namespace PostDetail {
  export const PATH = "/:id";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export interface Response {
    readonly id: bigint;
    readonly title: string;
    readonly content: string;
    readonly post_state: $Enums.post_state;
    readonly writer_id: string;
    readonly created_date: Date;
  }
}
