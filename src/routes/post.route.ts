import { FastifyInstance } from "fastify";
import { assertCreatePostDto } from "../dto/post/createPost.dto.js";
import { authGuard } from "../plugins/auth.guard.js";
import { PostService } from "../services/post.service.js";
import { assertUpdatePostDto } from "../dto/post/updatePost.dto.js";
import { IPostPageQuerystring, IPostParams, IPostSearchQuerystring } from "./constant/post.route.constant.js";

export async function postRoutes(app: FastifyInstance) {
  app.post("/create", { preHandler: authGuard }, async (req, reply) => {
    assertCreatePostDto(req.body);

    const { username } = req.user as { username: string };
    await PostService.createPost(req.body, username);

    reply.send({ ok: true });
  });

  app.put<{ Params: IPostParams }>(
    "/:id",
    { preHandler: authGuard },
    async (req, reply) => {
      assertUpdatePostDto(req.body);
      const { id } = req.params;
      const { username } = req.user as { username: string };

      await PostService.updatePost(req.body, id, username);

      reply.send({ ok: true });
    }
  );

  app.delete<{ Params: IPostParams }>(
    "/:id",
    { preHandler: authGuard },
    async (req, reply) => {
      const { id } = req.params;
      const { username } = req.user as { username: string };

      await PostService.removePost(id, username);

      reply.send({ ok: true });
    }
  );

  // app.get<{ Params: { id: bigint } }> is Same.
  app.get<{ Params: IPostParams }>("/:id", async (req, reply) => {
    const { id } = req.params;
    const post = await PostService.getPostById(id);

    reply.send(post);
  });

  // app.get<{ Querystrig: { "last-id"?: bigint } }> is Same.
  app.get<{ Querystring: IPostPageQuerystring }>("/", async (req, reply) => {
    const lastId = req.query["last-id"]
      ? BigInt(req.query["last-id"])
      : undefined;

    const postPages = await PostService.getAllPostPages(lastId);

    reply.send(postPages);
  });

  app.get<{ Querystring: IPostPageQuerystring }>(
    "/writers",
    { preHandler: authGuard },
    async (req, reply) => {
      const lastId = req.query["last-id"]
        ? BigInt(req.query["last-id"])
        : undefined;
      const { username } = req.user as { username: string };

      const postPages = await PostService.getPostPagesByWriter(
        username,
        lastId
      );

      reply.send(postPages);
    }
  );

  // app.get<{ Querystrig: { keyword: string; "last-id"?: bigint } }> is Same.
  app.get<{ Querystring: IPostSearchQuerystring }>(
    "/search",
    async (req, reply) => {
      const { keyword } = req.query;
      const lastId = req.query["last-id"]
        ? BigInt(req.query["last-id"])
        : undefined;

      const postPages = await PostService.searchPostPages(keyword, lastId);

      reply.send(postPages);
    }
  );
}
