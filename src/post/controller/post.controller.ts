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

        reply.status(201).send({ ok: true } satisfies CreatePost.Response);
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

        reply.send({ ok: true } satisfies UpdatePost.Response);
      },
    );

    app.delete<{ Params: IPostParams }>(
      RemovePost.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const { id } = req.params;
        const userId = (req.user as AuthUser).id;

        await postService.removePost(id, userId);

        reply.send({ ok: true } satisfies RemovePost.Response);
      },
    );

    // app.get<{ Params: { id: bigint } }> is Same.
    app.get<{ Params: IPostParams }>(PostDetail.PATH, async (req, reply) => {
      const { id } = req.params;
      const post = await postService.getPostById(id);

      reply.send({
        ok: true,
        postDetailDto: post,
      } satisfies PostDetail.Response);
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
