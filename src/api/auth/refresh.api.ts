export namespace Refresh {
  export const PATH = "/refresh";
  export const METHOD = "POST" as const;
  export const STATUS = 200 as const;

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
