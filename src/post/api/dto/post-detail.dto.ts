export interface PostDetailDto {
  readonly id: bigint;
  readonly title: string;
  readonly content: string;
  readonly post_state: "ORIGINAL" | "EDITED";
  readonly writer_id: string;
  readonly created_date: Date;
}
