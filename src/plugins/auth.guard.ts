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
    // const name = error?.name;
    // const message = (error as any)?.message;

    // if (
    //   name === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED" ||
    //   message?.toLowerCase().includes("expired")
    // ) {
    //   const errorMsg = "TOKEN_EXPIRED";
    //   logger.error(`Auth Guard occurs Error. Cause : ${errorMsg}`);
    //   return reply.status(401).send({ error: errorMsg });
    // }

    // if (name === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
    //   const errorMsg = "NO_TOKEN_PROVIDED";
    //   logger.error(`Auth Guard occurs Error. Cause : ${errorMsg}`);
    //   return reply.status(401).send({ error: errorMsg });
    // }

    // if (name === "FST_JWT_BAD_REQUEST") {
    //   const errorMsg = "BAD_TOKEN_FORMAT";
    //   logger.error(`Auth Guard occurs Error. Cause : ${errorMsg}`);
    //   return reply.status(400).send({ error: errorMsg });
    // }

    // if (name === "FST_JWT_AUTHORIZATION_TOKEN_INVALID") {
    //   const errorMsg = "INVALID_TOKEN";
    //   logger.error(`Auth Guard occurs Error. Cause : ${errorMsg}`);
    //   return reply.status(401).send({ error: errorMsg });
    // }

    // // others
    // const errorMsg = "UNAUTHORIZED";
    // logger.error(`Auth Guard occurs Error. Cause : ${errorMsg}`);
    // return reply.status(401).send({ error: errorMsg });
  }
}
