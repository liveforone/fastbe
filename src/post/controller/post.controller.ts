import { FastifyInstance } from "fastify";
import { authGuard } from "../../plugins/auth.guard.js";
import { PostService } from "../service/post.service.js";
import { CreatePost } from "../api/create-post.api.js";
import { AuthUser } from "../../type/authUser.type.js";
import { UpdatePost } from "../api/update-post.api.js";
import {
  IPostPageQuerystring,
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

    app.put<{ Body: UpdatePost.Request; Params: UpdatePost.Params }>(
      UpdatePost.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const parsedBody = UpdatePost.RequestSchema.parse(req.body);
        const params = UpdatePost.ParamsSchema.parse(req.params);
        const userId = (req.user as AuthUser).id;

        await postService.updatePost(parsedBody, params.id, userId);

        reply.send({ ok: true } satisfies UpdatePost.Response);
      },
    );

    app.delete<{ Params: RemovePost.Params }>(
      RemovePost.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const params = RemovePost.ParamsSchema.parse(req.params);
        const userId = (req.user as AuthUser).id;

        await postService.removePost(params.id, userId);

        reply.send({ ok: true } satisfies RemovePost.Response);
      },
    );

    // app.get<{ Params: { id: bigint } }> is Same.
    app.get<{ Params: PostDetail.Params }>(
      PostDetail.PATH,
      async (req, reply) => {
        const params = PostDetail.ParamsSchema.parse(req.params);
        const post = await postService.getPostById(params.id);

        reply.send({
          ok: true,
          postDetailDto: post,
        } satisfies PostDetail.Response);
      },
    );

    // app.get<{ Querystrig: { "last-id"?: bigint } }> is Same.
    app.get<{ Querystring: PostHome.Query }>(
      PostHome.PATH,
      async (req, reply) => {
        const query = PostHome.QuerySchema.parse(req.query);
        /**
         * If you use a querystring as shown in the comment above, extract it as follows.
         * const lastId = req.query["last-id"] ? BigInt(req.query["last-id"]) : undefined;
         * const postPages = await postService.getAllPostPages(lastId);
         */

        const postPages = await postService.getAllPostPages(query["last-id"]);

        reply.send(postPages);
      },
    );

    app.get<{ Querystring: PostBelongWriter.Query }>(
      PostBelongWriter.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const query = PostBelongWriter.QuerySchema.parse(req.query);
        const userId = (req.user as AuthUser).id;

        const postPages = await postService.getPostPagesByWriter(
          userId,
          query["last-id"],
        );
        reply.send(postPages);
      },
    );

    // app.get<{ Querystrig: { keyword: string; "last-id"?: bigint } }> is Same.
    app.get<{ Querystring: PostSearch.Query }>(
      PostSearch.PATH,
      async (req, reply) => {
        /**
         * If you use a querystring as shown in the comment above, extract it as follows.
         * const { keyword } = req.query;
         * const lastId = req.query["last-id"]
         * ? BigInt(req.query["last-id"])
         * : undefined;
         */
        const query = PostSearch.QuerySchema.parse(req.query);

        const postPages = await postService.searchPostPages(
          query.keyword,
          query["last-id"],
        );
        reply.send(postPages);
      },
    );
  };
}
