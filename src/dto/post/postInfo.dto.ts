import { $Enums, Prisma } from "../../../generated/prisma/client.js";

export interface PostInfoDto {
  readonly id: bigint;
  readonly title: string;
  readonly content: string;
  readonly post_state: $Enums.post_state;
  readonly username: string;
  readonly created_date: string;
}

type TPostInfo = Prisma.postGetPayload<{ include: { writer: true } }>;

export function toPostInfoDto(post: TPostInfo): PostInfoDto {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    post_state: post.post_state,
    username: post.writer.username,
    created_date: post.created_date.toISOString(),
  };
}
