import z from "zod/v3";

export namespace UpdatePassword {
  export const PATH = "/update/password";
  export const METHOD = "PATCH" as const;
  export const STATUS = 200 as const;

  export const RequestSchema = z.object({
    originalPassword: z.string().min(2),
    newPassword: z.string().min(2),
  });
  export type Request = z.infer<typeof RequestSchema>;

  export interface Response {
    ok: true;
  }
}
