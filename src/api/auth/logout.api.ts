export namespace Logout {
  export const PATH = "/logout";
  export const METHOD = "POST" as const;
  export const STATUS = 200 as const;

  export const COOKIE_NAME = "refreshToken";
  export interface CookieOptions {
    path: "/auth";
  }
  export interface Response {
    ok: true;
  }
}
