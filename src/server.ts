import "dotenv/config";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.route.js";
import { postRoutes } from "./routes/post.route.js";

const app = Fastify({
  logger: true,
});
app.setReplySerializer((payload) =>
  JSON.stringify(payload, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  )
);
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
  reply.status(error.statusCode || 500).send({ error: error.message });
});
app.listen({ port: 8080 }, () => {
  console.log("http://localhost:8080");
});
