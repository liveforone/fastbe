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

/**
 * ===============================
 * Custom serializer for responses
 * ===============================
 *
 * Converts BigInt to string (JSON does not support BigInt)
 * Ensures null/undefined responses return empty string
 * If your API returns BigInt (e.g., database IDs),
 * you don't need to manually convert them.
 */
app.setReplySerializer((payload) => {
  if (payload === undefined || payload === null) {
    return "";
  }

  return JSON.stringify(payload, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
});

/**
 * =========================
 * CORS CONFIGURATION (DEV)
 * =========================
 *
 * This configuration is recommended ONLY for development/testing.
 * Remove or comment this out after development is complete.
 *
 * What you should do:
 * - Set FRONTEND_ORIGIN in your .env file
 *
 * Example:
 * FRONTEND_ORIGIN=http://localhost:5173
 */
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

/**
 * =========================
 * CORS CONFIGURATION (PROD)
 * =========================
 *
 * This configuration is intended for production.
 * Uncomment this before deploying.
 *
 * What you should do:
 * - Replace allowedOrigins with your real frontend domains
 *
 * Example:
 * const allowedOrigins = [
 *   "https://your-app.com",
 *   "https://admin.your-app.com"
 * ];
 */
// const allowedOrigins = [""];
// app.register(cors, {
//   origin: (origin, cb) => {
//     try {
//       // A preflight request may not have an origin.
//       if (!origin) return cb(null, true);

//       if (allowedOrigins.includes(origin)) {
//         return cb(null, true);
//       }

//       // Reject: return false without ever producing a 500 error.
//       return cb(null, false);
//     } catch (err) {
//       // Ensure that no exceptions are thrown inside the callback.
//       return cb(null, false);
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
// });

/**
 * ==============
 * Cookie support
 * ==============
 *
 * Needed if you store auth tokens in cookies
 */
app.register(cookie);

/**
 * ========================
 * JWT authentication setup
 * ========================
 *
 * What you should do:
 * - Set SECRET in your .env file
 *
 * Example:
 * SECRET=super-secret-key
 */
app.register(jwt, { secret: process.env.SECRET! });

/**
 * =============================================
 * Dependency Injection container initialization
 * =============================================
 *
 * This is where your services/repositories are wired
 */
createDIContainer(app);

/**
 * ====================
 * Global error handler
 * ====================
 *
 * Automatically formats validation errors (Zod)
 * Prevents raw errors from leaking to clients
 */
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
