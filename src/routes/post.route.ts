import { FastifyInstance } from "fastify";
import { authGuard } from "../plugins/auth.guard.js";
import { PostService } from "../services/post.service.js";
import {
  IPostPageQuerystring,
  IPostParams,
  IPostSearchQuerystring,
} from "./constant/post.route.constant.js";
import { AuthUser } from "../type/authUser.type.js";
import { CreatePost } from "../api/post/create-post.api.js";
import { UpdatePost } from "../api/post/update-post.api.js";
import { RemovePost } from "../api/post/remove-post.api.js";
import { PostDetail } from "../api/post/post-detail.api.js";
import { PostHome } from "../api/post/post-home.api.js";
import { PostBelongWriter } from "../api/post/post-belong-writer.api.js";
import { PostSearch } from "../api/post/post-search.api.js";

export async function postRoutes(app: FastifyInstance) {
  app.post<{ Body: CreatePost.Request }>(
    CreatePost.PATH,
    { preHandler: authGuard },
    async (req, reply) => {
      const parsedBody = CreatePost.RequestSchema.parse(req.body);
      const { id } = req.user as AuthUser;
      await PostService.createPost(parsedBody, id);

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

      await PostService.updatePost(parsedBody, id, userId);

      reply.send({ ok: true });
    },
  );

  app.delete<{ Params: IPostParams }>(
    RemovePost.PATH,
    { preHandler: authGuard },
    async (req, reply) => {
      const { id } = req.params;
      const userId = (req.user as AuthUser).id;

      await PostService.removePost(id, userId);

      reply.send({ ok: true });
    },
  );

  // app.get<{ Params: { id: bigint } }> is Same.
  app.get<{ Params: IPostParams }>(PostDetail.PATH, async (req, reply) => {
    const { id } = req.params;
    const post = await PostService.getPostById(id);

    reply.send(post);
  });

  // app.get<{ Querystrig: { "last-id"?: bigint } }> is Same.
  app.get<{ Querystring: IPostPageQuerystring }>(
    PostHome.PATH,
    async (req, reply) => {
      const lastId = req.query["last-id"]
        ? BigInt(req.query["last-id"])
        : undefined;

      const postPages = await PostService.getAllPostPages(lastId);
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

      const postPages = await PostService.getPostPagesByWriter(userId, lastId);
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

      const postPages = await PostService.searchPostPages(keyword, lastId);
      reply.send(postPages);
    },
  );
}
