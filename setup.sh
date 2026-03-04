#!/bin/bash
set -e

echo "🚀 Initializing fastbe boilerplate..."

########################################
# 1. INIT
########################################

npm init -y

npm install fastify @fastify/jwt @fastify/cookie @fastify/cors bcrypt zod ioredis pg dotenv pino pino-pretty kysely
npm install -D typescript ts-node tsx @types/node @types/bcrypt @types/pg vitest

########################################
# 2. MODIFY PACKAGE.JSON
########################################

node <<'EOF'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));

pkg.type = "module";

if (pkg.main) {
  delete pkg.main;
}

pkg.scripts = {
  "dev": "tsx watch src/server.ts | pino-pretty",
  "build": "tsc",
  "start": "node dist/src/server.js | pino-pretty",
  "test": "npx vitest src/__test__/"
};

fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
EOF

########################################
# 3. TSCONFIG
########################################

cat <<EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"]
}
EOF

########################################
# 4. VITEST CONFIG
########################################

cat <<EOF > vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30_000,
    setupFiles: ["dotenv/config"],
    include: ["src/**/*.test.ts"],
    exclude: ["dist", "node_modules"],
  },
});
EOF

########################################
# 5. GITIGNORE
########################################

cat <<EOF > .gitignore
node_modules
.env
.env.dev
.env.production
/generated/prisma
/dist
.DS_Store
TODO.md
EOF

########################################
# 6. ENV
########################################

cat <<EOF > .env
DATABASE_URL="postgresql://postgres:ur_password@localhost:5432/ur_db_name?schema=public"

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD="ur_redis_password_this_is_optional"

SECRET=ur_secret_value

FRONTEND_ORIGIN=http://localhost:5173
EOF

########################################
# 7. FOLDERS
########################################

mkdir -p src/__test__
mkdir -p src/config
mkdir -p src/database
mkdir -p src/errors/database
mkdir -p src/plugins
mkdir -p src/type
mkdir -p src/users/api
mkdir -p src/users/controller
mkdir -p src/users/repository
mkdir -p src/users/service
mkdir -p src/post/api
mkdir -p src/post/api/dto
mkdir -p src/post/controller
mkdir -p src/post/controller/constant
mkdir -p src/post/repository
mkdir -p src/post/service
mkdir -p src/util

########################################
# 8. CONFIG
########################################

cat <<'EOF' > src/config/logger.ts
import pino from "pino";

export const logger = pino({
  level: "info",
});
EOF

cat <<'EOF' > src/config/redis.ts
import { Redis } from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
  // password: process.env.REDIS_PASSWORD!,
});
EOF

########################################
# 9. DATABASE
########################################

cat <<'EOF' > src/database/init.sql
CREATE TYPE role AS ENUM ('MEMBER', 'ADMIN');
CREATE TYPE post_state AS ENUM ('ORIGINAL', 'EDITED');

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role role NOT NULL DEFAULT 'MEMBER'
);

CREATE INDEX idx_username ON users(username);

CREATE TABLE post (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_state post_state NOT NULL DEFAULT 'ORIGINAL',
    writer_id TEXT NOT NULL,
    created_date TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (writer_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_post_writer_id ON post(writer_id);
EOF

cat <<'EOF' > src/database/schema.ts
import { Generated, Selectable } from "kysely";

export interface Database {
  users: UsersTable;
  post: PostTable;
}

export interface UsersTable {
  id: string;
  username: string;
  password: string;
  role: "MEMBER" | "ADMIN";
}
export type Users = Selectable<UsersTable>;

export interface PostTable {
  id: Generated<bigint>;
  title: string;
  content: string;
  post_state: "ORIGINAL" | "EDITED";
  writer_id: string;
  created_date: Generated<Date>;
}
export type Post = Selectable<PostTable>;
EOF

cat <<'EOF' > src/database/database.ts
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Database } from "./schema.js";

export function createDB(): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    }),
  });

  return new Kysely<Database>({ dialect });
}
EOF

cat <<'EOF' > src/database/base.repository.ts
import { Kysely } from "kysely";
import { Database } from "./schema.js";
import { withKyselyError } from "../errors/kysely.error.handler.js";
import { GlobalError } from "../errors/global.error.js";

export abstract class BaseRepository {
  constructor(protected readonly db: Kysely<Database>) {}

  /**
   * A `SELECT` statement that must return exactly one row.
   */
  protected async executeOne<T>(fn: () => Promise<T | undefined>): Promise<T> {
    return withKyselyError(async () => {
      const result = await fn();

      if (!result) {
        throw new GlobalError("RESOURCE_NOT_FOUND", 404);
      }

      return result;
    });
  }

  /**
   * A standard `SELECT` statement (returning zero rows is acceptable).
   * Example: pagination, search.
   */
  protected async executeQuery<T>(fn: () => Promise<T>): Promise<T> {
    return withKyselyError(fn);
  }

  /**
   * UPDATE / DELETE
   * The operation is considered successful only if at least one row is modified.
   */
  protected async executeMutation<
    T extends {
      numUpdatedRows?: bigint | number;
      numDeletedRows?: bigint | number;
    },
  >(fn: () => Promise<T>): Promise<T> {
    return withKyselyError(async () => {
      const result = await fn();

      const updated =
        result.numUpdatedRows !== undefined
          ? BigInt(result.numUpdatedRows)
          : undefined;

      const deleted =
        result.numDeletedRows !== undefined
          ? BigInt(result.numDeletedRows)
          : undefined;

      const affected = updated ?? deleted ?? 0n;

      if (affected === 0n) {
        throw new GlobalError("RESOURCE_NOT_FOUND", 404);
      }

      return result;
    });
  }
}
EOF

########################################
# 10. ERRORS
########################################

cat <<'EOF' > src/errors/database/db-error.enum.ts
export enum DBErrorCode {
  DUPLICATE_RESOURCE = "DUPLICATE_RESOURCE",
  FOREIGN_KEY_VIOLATION = "FOREIGN_KEY_VIOLATION",
  NOT_NULL_VIOLATION = "NOT_NULL_VIOLATION",
  CHECK_CONSTRAINT_VIOLATION = "CHECK_CONSTRAINT_VIOLATION",
  INTEGRITY_CONSTRAINT_VIOLATION = "INTEGRITY_CONSTRAINT_VIOLATION",
  INVALID_INPUT_SYNTAX = "INVALID_INPUT_SYNTAX",
  DATA_EXCEPTION = "DATA_EXCEPTION",
  SERIALIZATION_FAILURE = "SERIALIZATION_FAILURE",
  DEADLOCK_DETECTED = "DEADLOCK_DETECTED",
  TRANSACTION_ROLLBACK = "TRANSACTION_ROLLBACK",
  INVALID_AUTHORIZATION = "INVALID_AUTHORIZATION",
  SYNTAX_ERROR = "SYNTAX_ERROR",
  INSUFFICIENT_RESOURCES = "INSUFFICIENT_RESOURCES",
  OPERATOR_INTERVENTION = "OPERATOR_INTERVENTION",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  DATABASE_ERROR = "DATABASE_ERROR",
}
EOF

cat <<'EOF' > src/errors/database/db-error.map.ts
import { DBErrorCode } from "./db-error.enum.js";

export const DBErrorStatusMap: Record<DBErrorCode, number> = {
  DUPLICATE_RESOURCE: 409,
  FOREIGN_KEY_VIOLATION: 400,
  NOT_NULL_VIOLATION: 400,
  CHECK_CONSTRAINT_VIOLATION: 400,
  INTEGRITY_CONSTRAINT_VIOLATION: 400,
  INVALID_INPUT_SYNTAX: 400,
  DATA_EXCEPTION: 400,
  SERIALIZATION_FAILURE: 409,
  DEADLOCK_DETECTED: 409,
  TRANSACTION_ROLLBACK: 409,
  INVALID_AUTHORIZATION: 401,
  SYNTAX_ERROR: 400,
  INSUFFICIENT_RESOURCES: 503,
  OPERATOR_INTERVENTION: 503,
  SYSTEM_ERROR: 500,
  RESOURCE_NOT_FOUND: 404,
  DATABASE_ERROR: 500,
};
EOF

cat <<'EOF' > src/errors/global.error.ts
export class GlobalError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GlobalError.prototype);
  }
}
EOF

cat <<'EOF' > src/errors/kysely.error.handler.ts
import { logger } from "../config/logger.js";
import { GlobalError } from "./global.error.js";
import { DBErrorCode } from "./database/db-error.enum.js";
import { DBErrorStatusMap } from "./database/db-error.map.js";

function throwDBError(code: DBErrorCode): never {
  const status = DBErrorStatusMap[code];
  throw new GlobalError(code, status);
}

function mapPostgresError(error: any): never {
  const pgCode: string | undefined = error?.code;

  if (!pgCode) {
    logger.error(error);
    throwDBError(DBErrorCode.DATABASE_ERROR);
  }

  const errorClass = pgCode.substring(0, 2);

  // ======================
  // Specific PostgreSQL codes
  // ======================

  switch (pgCode) {
    case "23505":
      throwDBError(DBErrorCode.DUPLICATE_RESOURCE);

    case "23503":
      throwDBError(DBErrorCode.FOREIGN_KEY_VIOLATION);

    case "23502":
      throwDBError(DBErrorCode.NOT_NULL_VIOLATION);

    case "23514":
      throwDBError(DBErrorCode.CHECK_CONSTRAINT_VIOLATION);

    case "22P02":
      throwDBError(DBErrorCode.INVALID_INPUT_SYNTAX);

    case "40001":
      throwDBError(DBErrorCode.SERIALIZATION_FAILURE);

    case "40P01":
      throwDBError(DBErrorCode.DEADLOCK_DETECTED);
  }

  // ======================
  // Class-level fallback
  // ======================

  switch (errorClass) {
    case "22":
      throwDBError(DBErrorCode.DATA_EXCEPTION);

    case "23":
      throwDBError(DBErrorCode.INTEGRITY_CONSTRAINT_VIOLATION);

    case "28":
      throwDBError(DBErrorCode.INVALID_AUTHORIZATION);

    case "40":
      throwDBError(DBErrorCode.TRANSACTION_ROLLBACK);

    case "42":
      throwDBError(DBErrorCode.SYNTAX_ERROR);

    case "53":
      throwDBError(DBErrorCode.INSUFFICIENT_RESOURCES);

    case "57":
      throwDBError(DBErrorCode.OPERATOR_INTERVENTION);

    case "58":
      throwDBError(DBErrorCode.SYSTEM_ERROR);
  }

  // ======================
  // Kysely executeTakeFirstOrThrow
  // ======================

  if (error.message?.includes("no result")) {
    throwDBError(DBErrorCode.RESOURCE_NOT_FOUND);
  }

  logger.error(error);
  throwDBError(DBErrorCode.DATABASE_ERROR);
}

export async function withKyselyError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error instanceof GlobalError) {
      throw error;
    }

    mapPostgresError(error);
  }
}
EOF

########################################
# 11. SERVER
########################################

cat <<'EOF' > src/server.ts
import "dotenv/config";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { ZodError } from "zod/v3";
import { createDIContainer } from "./di.container.js";

const app = Fastify({
  logger: true,
});

app.setReplySerializer((payload) => {
  if (payload === undefined || payload === null) {
    return "";
  }

  return JSON.stringify(payload, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
});

/**
 * This code is example of unusing cookie and jwt.
 * No user authentication service use this code.
 */
// await app.register(cors, {
//   origin: ["http://localhost:5173", "https://real.frontend.url"],
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
// });
app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    const allowed = process.env.FRONTEND_ORIGIN;
    if (origin === allowed) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(cookie);

app.register(jwt, { secret: process.env.SECRET! });

createDIContainer(app);

app.setErrorHandler((error: any, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "INVALID_DTO",
      issues: error.issues,
    });
  }
  reply.status(error.statusCode || 500).send({ error: error.message });
});

async function bootstrap() {
  try {
    await app.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Server listening on http://localhost:8080");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
EOF

########################################
# 12. plugins 
########################################

cat <<'EOF' > src/plugins/auth.guard.ts
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
EOF

########################################
# 13. type 
########################################

cat <<'EOF' > src/type/authUser.type.ts
export type AuthUser = {
  id: string;
};
EOF

cat <<'EOF' > src/type/payload.type.ts
type TokenType = "access" | "refresh";

interface BaseTokenPayload {
  id: string;
  typ: TokenType;
}

export type AccessTokenPayload = BaseTokenPayload & {
  typ: "access";
};

export type RefreshTokenPayload = BaseTokenPayload & {
  typ: "refresh";
};

export function createTokenPayload<T extends TokenType>(
  id: string,
  typ: T
): BaseTokenPayload & { typ: T } {
  return { id, typ };
}
EOF

########################################
# 14. util 
########################################

cat <<'EOF' > src/util/password.util.ts
import bcrypt from "bcrypt";
import { GlobalError } from "../errors/global.error.js";

export async function verifyPassword(
  plain: string,
  hashed: string,
): Promise<void> {
  const valid = await bcrypt.compare(plain, hashed);
  if (!valid) {
    const errorMsg = "Wrong Password";
    throw new GlobalError(errorMsg, 401);
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
EOF

########################################
# 15. users api spec
########################################

cat <<'EOF' > src/users/api/login.api.ts
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
    path: "/users";
  }
  export interface Response {
    accessToken: string;
  }
}
EOF

cat <<'EOF' > src/users/api/logout.api.ts
export namespace Logout {
  export const PATH = "/logout";
  export const METHOD = "POST" as const;
  export const STATUS = 200 as const;

  export const COOKIE_NAME = "refreshToken";
  export interface CookieOptions {
    path: "/users";
  }
  export interface Response {
    ok: true;
  }
}
EOF

cat <<'EOF' > src/users/api/refresh.api.ts
export namespace Refresh {
  export const PATH = "/refresh";
  export const METHOD = "POST" as const;
  export const STATUS = 200 as const;

  export const COOKIE_NAME = "refreshToken";
  export interface CookieOptions {
    httpOnly: true;
    secure: false; //https -> true
    sameSite: "lax"; //cross-site -> none + secure=true
    path: "/users";
  }
  export interface Response {
    accessToken: string;
  }
}
EOF

cat <<'EOF' > src/users/api/signup.api.ts
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
EOF

cat <<'EOF' > src/users/api/update-password.api.ts
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
EOF


########################################
# 16. users controller
########################################

cat <<'EOF' > src/users/controller/users.controller.ts
import { FastifyInstance } from "fastify";
import { authGuard } from "../../plugins/auth.guard.js";
import {
  createTokenPayload,
  RefreshTokenPayload,
} from "../../type/payload.type.js";
import { AuthUser } from "../../type/authUser.type.js";
import { Signup } from "../api/signup.api.js";
import { Login } from "../api/login.api.js";
import { Refresh } from "../api/refresh.api.js";
import { Logout } from "../api/logout.api.js";
import { UpdatePassword } from "../api/update-password.api.js";
import { UsersService } from "../service/users.service.js";

export function createUsersController(usersService: UsersService) {
  return async function UsersController(app: FastifyInstance) {
    app.post<{ Body: Signup.Request }>(Signup.PATH, async (req, reply) => {
      const parsedBody = Signup.RequestSchema.parse(req.body);
      await usersService.signup(parsedBody);
      reply.send({ ok: true });
    });

    app.post<{ Body: Login.Request }>(Login.PATH, async (req, reply) => {
      const user = await usersService.login(req.body);

      const accessPayload = createTokenPayload(user.id, "access");
      const accessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

      const refreshPayload = createTokenPayload(user.id, "refresh");
      const refreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

      await usersService.saveRefreshToken(user.id, refreshToken);

      reply
        .setCookie(Login.COOKIE_NAME, refreshToken, {
          httpOnly: true,
          secure: false, //https -> true
          sameSite: "lax", //cross-site -> none + secure=true
          path: "/users",
        } satisfies Login.CookieOptions)
        .send({ accessToken });
    });

    app.post(Refresh.PATH, async (req, reply) => {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return reply.status(401).send({ error: "Refresh Token Not Found" });
      }

      let payload: RefreshTokenPayload;
      try {
        payload = app.jwt.verify<any>(refreshToken);
      } catch {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }
      await usersService.validRefreshToken(payload.id, refreshToken);

      const user = await usersService.getUsersById(payload.id);

      const accessPayload = createTokenPayload(user.id, "access");
      const newAccessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

      const refreshPayload = createTokenPayload(user.id, "refresh");
      const newRefreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

      await usersService.saveRefreshToken(user.id, newRefreshToken);

      reply
        .setCookie(Refresh.COOKIE_NAME, newRefreshToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/users",
        } satisfies Refresh.CookieOptions)
        .send({ accessToken: newAccessToken });
    });

    app.post(Logout.PATH, async (req, reply) => {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return reply.status(401).send({ error: "No RefreshToken" });
      }

      try {
        const payload = app.jwt.verify<any>(refreshToken);
        await usersService.removeRefreshToken(payload.id);
      } catch {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      reply.clearCookie(Logout.COOKIE_NAME, {
        path: "/users",
      } satisfies Logout.CookieOptions);

      reply.send({ ok: true });
    });

    app.patch<{ Body: UpdatePassword.Request }>(
      UpdatePassword.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const { id } = req.user as AuthUser;
        await usersService.updatePassword(req.body, id);

        reply.send({ ok: true });
      },
    );
  };
}
EOF

########################################
# 17. users repository 
########################################

cat <<'EOF' > src/users/repository/users.repository.ts
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../util/password.util.js";
import { Signup } from "../api/signup.api.js";
import { withKyselyError } from "../../errors/kysely.error.handler.js";
import { BaseRepository } from "../../database/base.repository.js";

export class UsersRepository extends BaseRepository {
  async saveUsers(signupDto: Signup.Request) {
    const { username, password } = signupDto;
    const hashedPassword = await hashPassword(password);
    return this.executeOne(() =>
      this.db
        .insertInto("users")
        .values({
          id: randomUUID(),
          username: username,
          password: hashedPassword,
          role: "MEMBER",
        })
        .returningAll()
        .executeTakeFirst(),
    );
  }

  async findUsersByUsername(username: string) {
    return this.executeOne(() =>
      this.db
        .selectFrom("users")
        .where("username", "=", username)
        .selectAll()
        .executeTakeFirst(),
    );
  }

  async findUsersById(id: string) {
    return this.executeOne(() =>
      this.db
        .selectFrom("users")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirst(),
    );
  }

  async findPasswordById(id: string) {
    return this.executeOne(() =>
      this.db
        .selectFrom("users")
        .where("id", "=", id)
        .select("password")
        .executeTakeFirst(),
    );
  }

  async updatePasswordById(id: string, newPassword: string) {
    return this.executeMutation(() =>
      this.db
        .updateTable("users")
        .set("password", newPassword)
        .where("id", "=", id)
        .executeTakeFirst(),
    );
  }
}
EOF

########################################
# 18. users service 
########################################

cat <<'EOF' > src/users/service/users.service.ts
import { GlobalError } from "../../errors/global.error.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { Signup } from "../api/signup.api.js";
import { Login } from "../api/login.api.js";
import { UpdatePassword } from "../api/update-password.api.js";
import { UsersRepository } from "../repository/users.repository.js";
import { Users } from "../../database/schema.js";
import { hashPassword, verifyPassword } from "../../util/password.util.js";

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async signup(signupDto: Signup.Request): Promise<Users> {
    const user = await this.usersRepository.saveUsers(signupDto);
    logger.info(`User was created. Username : ${signupDto.username}`);
    return user;
  }

  async login(loginDto: Login.Request): Promise<Users> {
    const { username, password } = loginDto;
    const user = await this.usersRepository.findUsersByUsername(username);
    await verifyPassword(password, user.password);
    return user;
  }

  async saveRefreshToken(id: string, refreshToken: string) {
    await redis.set(`refresh:${id}`, refreshToken, "EX", 7 * 24 * 60 * 60);
  }

  async validRefreshToken(id: string, refreshToken: string) {
    const savedRefreshToken = await redis.get(`refresh:${id}`);

    if (savedRefreshToken !== refreshToken) {
      await redis.del(`refresh:${id}`);

      const errorMsg = "Mismatch Refresh Token";
      logger.error(`Valid Refresh Token occurs Error. Casue : ${errorMsg}`);
      throw new GlobalError(errorMsg, 401);
    }
  }

  async getUsersById(id: string): Promise<Users> {
    return await this.usersRepository.findUsersById(id);
  }

  async removeRefreshToken(id: string) {
    await redis.del(`refresh:${id}`);
  }

  async updatePassword(updatePasswordDto: UpdatePassword.Request, id: string) {
    const { originalPassword, newPassword } = updatePasswordDto;
    const hashedPassword = await this.usersRepository.findPasswordById(id);
    await verifyPassword(originalPassword, hashedPassword.password);

    const hashedNewPassword = await hashPassword(newPassword);
    await this.usersRepository.updatePasswordById(id, hashedNewPassword);

    await redis.del(`refresh:${id}`);
  }
}
EOF

########################################
# 19. di container 
########################################

cat <<'EOF' > src/di.container.ts
import { FastifyInstance } from "fastify";
import { createDB } from "./database/database.js";
import { createPostController } from "./post/controller/post.controller.js";
import { PostRepository } from "./post/repository/post.repository.js";
import { PostService } from "./post/service/post.service.js";
import { UsersRepository } from "./users/repository/users.repository.js";
import { UsersService } from "./users/service/users.service.js";
import { createUsersController } from "./users/controller/users.controller.js";

export function createDIContainer(app: FastifyInstance) {
  const db = createDB();

  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);
  app.register(createUsersController(usersService), {
    prefix: "/users",
  });

  const postRepository = new PostRepository(db);
  const postService = new PostService(postRepository);
  app.register(createPostController(postService), { prefix: "/posts" });
}
EOF

########################################
# 20. users test 
########################################

cat <<'EOF' > src/__test__/users.service.test.ts
import { UsersService } from "../users/service/users.service.js";
import bcrypt from "bcrypt";
import { redis } from "../config/redis.js";
import { Signup } from "../users/api/signup.api.js";
import { Login } from "../users/api/login.api.js";
import { UpdatePassword } from "../users/api/update-password.api.js";
import { createDB } from "../database/database.js";
import { UsersRepository } from "../users/repository/users.repository.js";

describe("AuthService Unit Test(Real DB / Redis)", () => {
  const db = createDB();
  let trx: any;
  let usersService: UsersService;

  beforeEach(async () => {
    trx = await db.startTransaction().execute();

    const usersRepository = new UsersRepository(trx);
    usersService = new UsersService(usersRepository);
    await redis.flushall();
  });

  afterAll(async () => {
    await trx.rollback();
    await redis.flushall();
    await redis.quit();
  });

  it("Signup Test [Success]", async () => {
    const username = "signup_test";
    const password = "test";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };

    const user = await usersService.signup(signupDto);

    expect(user).not.toBeNull();
    expect(user!.username).toBe(username);
    expect(await bcrypt.compare(password, user.password)).toBeTruthy();
  });

  it("Login Test [Success]", async () => {
    const username = "login_test";
    const password = "login_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    await usersService.signup(signupDto);

    const loginDto: Login.Request = { username: username, password: password };
    const user = await usersService.login(loginDto);

    expect(user.username).toBe(username);
  });

  it("Login Test [Fail - Wrong Password]", async () => {
    const username = "login_fail_test";
    const password = "login_fail_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    await usersService.signup(signupDto);

    const wrongPassword = "wrong_password";
    const loginDto: Login.Request = {
      username: username,
      password: wrongPassword,
    };
    await expect(usersService.login(loginDto)).rejects.toThrow(
      "Wrong Password",
    );
  });

  it("UpdatePassword Test [Success]", async () => {
    const username = "update_password_test";
    const password = "update_password_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    const user = await usersService.signup(signupDto);

    const newPassword = "new_password";
    const updatePasswordDto: UpdatePassword.Request = {
      originalPassword: password,
      newPassword,
    };
    await usersService.updatePassword(updatePasswordDto, user.id);

    const loginDto: Login.Request = {
      username: username,
      password: newPassword,
    };
    const foundUser = await usersService.login(loginDto);
    expect(foundUser.username).toBe(username);
  });

  it("UpdatePassword Test [Fail - Wrong Password]", async () => {
    const username = "update_password_fail_test";
    const password = "update_password_fail_test_password";
    const signupDto: Signup.Request = {
      username: username,
      password: password,
    };
    const user = await usersService.signup(signupDto);

    const wrongPassword = "wrong_password";
    const newPassword = "new_password";
    const updatePasswordDto: UpdatePassword.Request = {
      originalPassword: wrongPassword,
      newPassword: newPassword,
    };
    await expect(
      usersService.updatePassword(updatePasswordDto, user.id),
    ).rejects.toThrow("Wrong Password");
  });
});

EOF

########################################
# 21. post api spec 
########################################

cat <<'EOF' > src/post/api/dto/post-page.dto.ts
import { PostSummaryDto } from "./post-summary.dto.js";

export interface PostPageDto {
  readonly postSummaries: PostSummaryDto[];
  readonly metadata: {
    readonly lastId: bigint;
  };
}
EOF

cat <<'EOF' > src/post/api/dto/post-summary.dto.ts
export interface PostSummaryDto {
  readonly id: bigint;
  readonly title: string;
  readonly writer_id: string;
  readonly created_date: Date;
}
EOF

cat <<'EOF' > src/post/api/create-post.api.ts
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
EOF

cat <<'EOF' > src/post/api/post-belong-writer.api.ts
import { PostPageDto } from "./dto/post-page.dto.js";

export namespace PostBelongWriter {
  export const PATH = "/writers";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export type Response = PostPageDto;
}
EOF

cat <<'EOF' > src/post/api/post-detail.api.ts
export namespace PostDetail {
  export const PATH = "/:id";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export interface Response {
    readonly id: bigint;
    readonly title: string;
    readonly content: string;
    readonly post_state: "ORIGINAL" | "EDITED";
    readonly writer_id: string;
    readonly created_date: Date;
  }
}
EOF

cat <<'EOF' > src/post/api/post-home.api.ts
import { PostPageDto } from "./dto/post-page.dto.js";

export namespace PostHome {
  export const PATH = "";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export type Response = PostPageDto;
}
EOF

cat <<'EOF' > src/post/api/post-search.api.ts
import { PostPageDto } from "./dto/post-page.dto.js";

export namespace PostSearch {
  export const PATH = "/search";
  export const METHOD = "GET" as const;
  export const STATUS = 200 as const;

  export type Response = PostPageDto;
}
EOF

cat <<'EOF' > src/post/api/remove-post.api.ts
export namespace RemovePost {
  export const PATH = "/:id";
  export const METHOD = "DELETE" as const;
  export const STATUS = 200 as const;

  export interface Response {
    ok: true;
  }
}
EOF

cat <<'EOF' > src/post/api/update-post.api.ts
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
EOF

########################################
# 22. post controller 
########################################

cat <<'EOF' > src/post/controller/constant/post.controller.constant.ts
export interface IPostParams {
  id: bigint;
}

export interface IPostPageQuerystring {
   "last-id"?: bigint;
}

export interface IPostSearchQuerystring {
  keyword: string; 
  "last-id"?: bigint;
}
EOF

cat <<'EOF' > src/post/controller/post.controller.ts
import { FastifyInstance } from "fastify";
import { authGuard } from "../../plugins/auth.guard.js";
import { PostService } from "../service/post.service.js";
import { CreatePost } from "../api/create-post.api.js";
import { AuthUser } from "../../type/authUser.type.js";
import { UpdatePost } from "../api/update-post.api.js";
import {
  IPostPageQuerystring,
  IPostParams,
  IPostSearchQuerystring,
} from "./constant/post.controller.constant.js";
import { RemovePost } from "../api/remove-post.api.js";
import { PostDetail } from "../api/post-detail.api.js";
import { PostHome } from "../api/post-home.api.js";
import { PostBelongWriter } from "../api/post-belong-writer.api.js";
import { PostSearch } from "../api/post-search.api.js";

export function createPostController(postService: PostService) {
  return async function PostController(app: FastifyInstance) {
    app.post<{ Body: CreatePost.Request }>(
      CreatePost.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const parsedBody = CreatePost.RequestSchema.parse(req.body);
        const { id } = req.user as AuthUser;
        await postService.createPost(parsedBody, id);

        reply.send({ ok: true });
      },
    );

    app.put<{ Body: UpdatePost.Request; Params: IPostParams }>(
      "/:id",
      { preHandler: authGuard },
      async (req, reply) => {
        const parsedBody = UpdatePost.RequestSchema.parse(req.body);
        const { id } = req.params;
        const userId = (req.user as AuthUser).id;

        await postService.updatePost(parsedBody, id, userId);

        reply.send({ ok: true });
      },
    );

    app.delete<{ Params: IPostParams }>(
      RemovePost.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const { id } = req.params;
        const userId = (req.user as AuthUser).id;

        await postService.removePost(id, userId);

        reply.send({ ok: true });
      },
    );

    // app.get<{ Params: { id: bigint } }> is Same.
    app.get<{ Params: IPostParams }>(PostDetail.PATH, async (req, reply) => {
      const { id } = req.params;
      const post = await postService.getPostById(id);

      reply.send(post);
    });

    // app.get<{ Querystrig: { "last-id"?: bigint } }> is Same.
    app.get<{ Querystring: IPostPageQuerystring }>(
      PostHome.PATH,
      async (req, reply) => {
        const lastId = req.query["last-id"]
          ? BigInt(req.query["last-id"])
          : undefined;

        const postPages = await postService.getAllPostPages(lastId);
        reply.send(postPages);
      },
    );

    app.get<{ Querystring: IPostPageQuerystring }>(
      PostBelongWriter.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const lastId = req.query["last-id"]
          ? BigInt(req.query["last-id"])
          : undefined;
        const userId = (req.user as AuthUser).id;

        const postPages = await postService.getPostPagesByWriter(
          userId,
          lastId,
        );
        reply.send(postPages);
      },
    );

    // app.get<{ Querystrig: { keyword: string; "last-id"?: bigint } }> is Same.
    app.get<{ Querystring: IPostSearchQuerystring }>(
      PostSearch.PATH,
      async (req, reply) => {
        const { keyword } = req.query;
        const lastId = req.query["last-id"]
          ? BigInt(req.query["last-id"])
          : undefined;

        const postPages = await postService.searchPostPages(keyword, lastId);
        reply.send(postPages);
      },
    );
  };
}
EOF

########################################
# 23. post repository 
########################################

cat <<'EOF' > src/post/repository/post.repository.ts
import { CreatePost } from "../api/create-post.api.js";
import { UpdatePost } from "../api/update-post.api.js";
import { BaseRepository } from "../../database/base.repository.js";

export class PostRepository extends BaseRepository {
  private readonly PAGE_LIMIT_SIZE = 10;

  async savePost(createPostDto: CreatePost.Request, userId: string) {
    const { title, content } = createPostDto;
    return this.executeOne(() =>
      this.db
        .insertInto("post")
        .values({
          title,
          content,
          writer_id: userId,
          post_state: "ORIGINAL",
        })
        .returningAll()
        .executeTakeFirst(),
    );
  }

  async updatePostByIdAndWriterId(
    updatePostDto: UpdatePost.Request,
    id: bigint,
    userId: string,
  ) {
    const { title, content } = updatePostDto;
    return this.executeMutation(() =>
      this.db
        .updateTable("post")
        .set({
          title,
          content,
          post_state: "EDITED",
        })
        .where("id", "=", id)
        .where("writer_id", "=", userId)
        .executeTakeFirst(),
    );
  }

  async deletePostByIdAndWriterId(id: bigint, userId: string) {
    return this.executeMutation(() =>
      this.db
        .deleteFrom("post")
        .where("id", "=", id)
        .where("writer_id", "=", userId)
        .executeTakeFirst(),
    );
  }

  async findPostById(id: bigint) {
    return this.executeOne(() =>
      this.db
        .selectFrom("post")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirst(),
    );
  }

  async findAllPostPages(lastId?: bigint) {
    return this.executeQuery(async () => {
      let query = this.db
        .selectFrom("post")
        .select(["id", "title", "writer_id", "created_date"])
        .orderBy("id", "desc")
        .limit(this.PAGE_LIMIT_SIZE);

      if (lastId !== undefined) {
        query = query.where("id", "<", lastId);
      }

      return query.execute();
    });
  }

  async findPostPagesByWriterId(userId: string, lastId?: bigint) {
    return this.executeQuery(async () => {
      let query = this.db
        .selectFrom("post")
        .where("writer_id", "=", userId)
        .select(["id", "title", "writer_id", "created_date"])
        .orderBy("id", "desc")
        .limit(this.PAGE_LIMIT_SIZE);

      if (lastId !== undefined) {
        query = query.where("id", "<", lastId);
      }

      return query.execute();
    });
  }

  async searchPostPagesByTitle(keyword: string, lastId?: bigint) {
    return this.executeQuery(async () => {
      let query = this.db
        .selectFrom("post")
        .where("title", "like", `${keyword}%`)
        .select(["id", "title", "writer_id", "created_date"])
        .orderBy("id", "desc")
        .limit(this.PAGE_LIMIT_SIZE);

      if (lastId !== undefined) {
        query = query.where("id", "<", lastId);
      }

      return query.execute();
    });
  }
}
EOF

########################################
# 24. post service 
########################################

cat <<'EOF' > src/post/service/post.service.ts
import { CreatePost } from "../api/create-post.api.js";
import { PostBelongWriter } from "../api/post-belong-writer.api.js";
import { PostDetail } from "../api/post-detail.api.js";
import { PostHome } from "../api/post-home.api.js";
import { PostSearch } from "../api/post-search.api.js";
import { UpdatePost } from "../api/update-post.api.js";
import { PostRepository } from "../repository/post.repository.js";

export class PostService {
  constructor(private readonly postRepository: PostRepository) {}
  async createPost(
    createPostDto: CreatePost.Request,
    userId: string,
  ): Promise<bigint> {
    const post = await this.postRepository.savePost(createPostDto, userId);
    return post.id;
  }

  async updatePost(
    updatePostDto: UpdatePost.Request,
    id: bigint,
    userId: string,
  ) {
    await this.postRepository.updatePostByIdAndWriterId(
      updatePostDto,
      id,
      userId,
    );
  }

  async removePost(id: bigint, userId: string) {
    await this.postRepository.deletePostByIdAndWriterId(id, userId);
  }

  async getPostById(id: bigint): Promise<PostDetail.Response> {
    return await this.postRepository.findPostById(id);
  }

  /**
   * You have to add "setReplySerializer" setting in server.ts
   * This make bigint type work.
   */
  async getAllPostPages(lastId?: bigint): Promise<PostHome.Response> {
    const posts = await this.postRepository.findAllPostPages(lastId);
    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : (lastId ?? 0n);
    return {
      postSummaries: posts,
      metadata: {
        lastId: newLastId,
      },
    };
  }

  async getPostPagesByWriter(
    userId: string,
    lastId?: bigint,
  ): Promise<PostBelongWriter.Response> {
    const posts = await this.postRepository.findPostPagesByWriterId(
      userId,
      lastId,
    );
    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : (lastId ?? 0n);
    return {
      postSummaries: posts,
      metadata: {
        lastId: newLastId,
      },
    };
  }

  async searchPostPages(
    keyword: string,
    lastId?: bigint,
  ): Promise<PostSearch.Response> {
    const posts = await this.postRepository.searchPostPagesByTitle(
      keyword,
      lastId,
    );

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : (lastId ?? 0n);
    return {
      postSummaries: posts,
      metadata: {
        lastId: newLastId,
      },
    };
  }
}
EOF

########################################
# 25. post test 
########################################

cat <<'EOF' > src/__test__/post.service.test.ts
import { Signup } from "../users/api/signup.api.js";
import { redis } from "../config/redis.js";
import { GlobalError } from "../errors/global.error.js";
import { UsersService } from "../users/service/users.service.js";
import { createDB } from "../database/database.js";
import { PostRepository } from "../post/repository/post.repository.js";
import { PostService } from "../post/service/post.service.js";
import { UsersRepository } from "../users/repository/users.repository.js";
import { CreatePost } from "../post/api/create-post.api.js";
import { UpdatePost } from "../post/api/update-post.api.js";

describe("PostService Unit Test(Real DB / Redis)", () => {
  const db = createDB();
  let trx: any;
  let usersService: UsersService;
  let postService: PostService;

  beforeEach(async () => {
    trx = await db.startTransaction().execute();

    const usersRepository = new UsersRepository(trx);
    usersService = new UsersService(usersRepository);

    const postRepository = new PostRepository(trx);
    postService = new PostService(postRepository);
    await redis.flushall();
  });

  afterAll(async () => {
    await trx.rollback();
    await redis.flushall();
    await redis.quit();
  });

  it("Create Post Test [Success]", async () => {
    const username = "create_post_test";
    const password = "create_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await usersService.signup(signupDto);

    const title = "create_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await postService.createPost(createPostDto, user.id);

    const post = await postService.getPostById(postId);
    expect(post.id).toBe(postId);
  });

  it("Create Post Test [Fail - Wrong id]", async () => {
    const username = "create_post_fail_test";
    const password = "create_post_fail_test_password";
    const signupDto: Signup.Request = { username, password };
    await usersService.signup(signupDto);

    const title = "create_post_fail_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    await expect(
      postService.createPost(createPostDto, "worng_userId"),
    ).rejects.toThrow("FOREIGN_KEY_VIOLATION");
  });

  it("Update Post Test [Success]", async () => {
    const username = "update_post_test";
    const password = "update_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await usersService.signup(signupDto);

    const title = "update_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await postService.createPost(createPostDto, user.id);

    const updatedTitle = "updated_title";
    const updatedContent = "updated_content";
    const updatePostDto: UpdatePost.Request = {
      title: updatedTitle,
      content: updatedContent,
    };
    await postService.updatePost(updatePostDto, postId, user.id);
    const post = await postService.getPostById(postId);
    expect(post.title).toBe(updatedTitle);
    expect(post.content).toBe(updatedContent);
  });

  it("Remove Post Test [Success]", async () => {
    const username = "remove_post_test";
    const password = "remove_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await usersService.signup(signupDto);

    const title = "remove_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await postService.createPost(createPostDto, user.id);

    await postService.removePost(postId, user.id);
    await expect(postService.getPostById(postId)).rejects.toBeInstanceOf(
      GlobalError,
    );
  });
});

EOF

echo "✅ DONE."