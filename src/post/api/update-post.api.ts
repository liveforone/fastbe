import z from "zod/v3";

export namespace UpdatePost {
  export const PATH = "/:id";
  export const METHOD = "PUT" as const;
  export const STATUS = 200 as const;

  export const RequestSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
  });
  export type Request = z.infer<typeof RequestSchema>;

  export interface Response {
    ok: true;
  }
}
