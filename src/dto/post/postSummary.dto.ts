import { Prisma } from "../../../generated/prisma/client.js";

export interface PostSummaryDto {
  readonly id: bigint;
  readonly title: string;
  readonly username: string;
  readonly created_date: string;
}

type TPostSummary = Prisma.postGetPayload<{
  omit: {
    content: true;
    post_state: true;
  };
  include: {
    writer: {
      select: {
        username: true;
      };
    };
  };
}>;

export function toPostSummaryDto(post: TPostSummary): PostSummaryDto {
  return {
    id: post.id,
    title: post.title,
    username: post.writer.username,
    created_date: post.created_date.toISOString(),
  };
}
