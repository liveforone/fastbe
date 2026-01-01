import { PostSummaryDto } from "./postSummary.dto.js";

export interface PostPageDto {
  readonly postSummaries: PostSummaryDto[];
  readonly metadata: {
    readonly lastId: bigint;
  };
}
