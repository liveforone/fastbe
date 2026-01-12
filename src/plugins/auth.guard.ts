import { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../config/logger.js";

/**
 * client control expired token error
 * if (res.status === 401) {
 *  if (res.error === "TOKEN_EXPIRED") {
 *    await refresh();
 *    retryOriginalRequest();
 *  } else {
 *    logout();
 *  }
 */

type TAuthErrorCode =
  | "TOKEN_EXPIRED"
  | "NO_TOKEN_PROVIDED"
  | "BAD_TOKEN_FORMAT"
  | "INVALID_TOKEN"
  | "UNAUTHORIZED";

interface IAuthError {
  status: number;
  code: TAuthErrorCode;
  match: (error: any) => boolean;
}

const AUTH_ERROR_MAPPINGS: IAuthError[] = [
  {
    status: 401,
    code: "TOKEN_EXPIRED",
    match: (e) =>
      e?.name === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED" ||
      e?.message?.toLowerCase().includes("expired"),
  },
  {
    status: 401,
    code: "NO_TOKEN_PROVIDED",
    match: (e) => e?.name === "FST_JWT_NO_AUTHORIZATION_IN_HEADER",
  },
  {
    status: 400,
    code: "BAD_TOKEN_FORMAT",
    match: (e) => e?.name === "FST_JWT_BAD_REQUEST",
  },
  {
    status: 401,
    code: "INVALID_TOKEN",
    match: (e) => e?.name === "FST_JWT_AUTHORIZATION_TOKEN_INVALID",
  },
];

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch (error: any) {
    const mapping = AUTH_ERROR_MAPPINGS.find((m) => m.match(error)) ?? {
      status: 401,
      code: "UNAUTHORIZED" as const,
    };

    logger.error(
      {
        authError: mapping.code,
      },
      "Auth Guard Error"
    );

    return reply.status(mapping.status).send({
      error: mapping.code,
    });
  }
}
