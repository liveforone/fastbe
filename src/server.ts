import "dotenv/config";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.route.js";
import { postRoutes } from "./routes/post.route.js";
import { ZodError } from "zod/v3";

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
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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
});
app.register(cookie);
app.register(jwt, { secret: process.env.SECRET! });
app.register(authRoutes, { prefix: "/auth" });
app.register(postRoutes, { prefix: "/posts" });
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
