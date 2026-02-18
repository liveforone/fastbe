import z from "zod/v3";

export namespace CreatePost {
  export const PATH = "/create";
  export const METHOD = "POST" as const;
  export const STATUS = 201 as const;

  export const RequestSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
  });
  export type Request = z.infer<typeof RequestSchema>;

  export interface Response {
    ok: true;
  }
}
