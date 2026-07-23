import z from "zod/v3";

export namespace RemovePost {
  export const PATH = "/:id";
  export const METHOD = "DELETE" as const;
  export const STATUS = 200 as const;

  export const ParamsSchema = z.object({
    id: z.coerce.bigint(),
  });
  export type Params = z.infer<typeof ParamsSchema>;

  export interface Response {
    ok: true;
  }
}
