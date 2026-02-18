import z from "zod/v3";

export namespace Signup {
  export const PATH = "/signup";
  export const METHOD = "POST" as const;
  export const STATUS = 201 as const;

  export const RequestSchema = z.object({
    username: z.string().min(2),
    password: z.string().min(2),
  });
  export type Request = z.infer<typeof RequestSchema>;

  export interface Response {
    ok: true;
  }
}
