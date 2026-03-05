import { PostSummaryDto } from "./post-summary.dto.js";

export interface PostPageDto {
  readonly postSummaries: PostSummaryDto[];
  readonly metadata: {
    readonly lastId: bigint | null;
  };
}
