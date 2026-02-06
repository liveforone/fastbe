import z from "zod/v3";

export namespace Login {
  export const PATH = "/login";
  export const METHOD = "POST" as const;
  export const STATUS = 200 as const;

  export const RequestSchema = z.object({
    username: z.string().min(2),
    password: z.string().min(2),
  });
  export type Request = z.infer<typeof RequestSchema>;

  export const COOKIE_NAME = "refreshToken";
  export interface CookieOptions {
    httpOnly: true;
    secure: false; //https -> true
    sameSite: "lax"; //cross-site -> none + secure=true
    path: "/auth";
  }
  export interface Response {
    accessToken: string;
  }
}
