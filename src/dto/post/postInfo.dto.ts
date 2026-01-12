import { $Enums } from "../../../generated/prisma/client.js";

export interface PostInfoDto {
  readonly id: bigint;
  readonly title: string;
  readonly content: string;
  readonly post_state: $Enums.post_state;
  readonly writer_id: string;
  readonly created_date: Date;
}
