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
