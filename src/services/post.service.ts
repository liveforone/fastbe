import { prisma } from "../config/prisma.js";
import { CreatePostDto } from "../dto/post/createPost.dto.js";
import { PostInfoDto } from "../dto/post/postInfo.dto.js";
import { PostPageDto } from "../dto/post/postPage.dto.js";
import { UpdatePostDto } from "../dto/post/updatePost.dto.js";
import { withPrismaError } from "../errors/prismaError.handle.js";

export class PostService {
  static async createPost(
    createPostDto: CreatePostDto,
    userId: string
  ): Promise<bigint> {
    const { title, content } = createPostDto;
    const post = await withPrismaError(() =>
      prisma.post.create({ data: { title, content, writer_id: userId } })
    );

    return post.id;
  }

  static async updatePost(
    updatePostDto: UpdatePostDto,
    id: bigint,
    userId: string
  ) {
    const { title, content } = updatePostDto;
    await withPrismaError(() =>
      prisma.post.updateMany({
        where: {
          id: id,
          writer_id: userId,
        },
        data: {
          title: title,
          content: content,
          post_state: "EDITED",
        },
      })
    );
  }

  static async removePost(id: bigint, userId: string) {
    await withPrismaError(() =>
      prisma.post.deleteMany({
        where: {
          id: id,
          writer_id: userId,
        },
      })
    );
  }

  static async getPostById(id: bigint): Promise<PostInfoDto> {
    return await withPrismaError(() =>
      prisma.post.findUniqueOrThrow({
        where: { id: id },
      })
    );
  }

  /**
   * You have to add "setReplySerializer" setting in server.ts
   * This make bigint type work.
   */
  static async getAllPostPages(lastId?: bigint): Promise<PostPageDto> {
    const posts = await withPrismaError(() =>
      prisma.post.findMany({
        take: 10,
        orderBy: {
          id: "desc",
        },
        ...(lastId !== undefined && {
          cursor: {
            id: lastId,
          },
          skip: 1,
        }),
        omit: {
          content: true,
          post_state: true,
        },
      })
    );

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : lastId ?? 0n;
    return {
      postSummaries: posts,
      metadata: {
        lastId: newLastId,
      },
    };
  }

  static async getPostPagesByWriter(
    userId: string,
    lastId?: bigint
  ): Promise<PostPageDto> {
    const posts = await withPrismaError(() =>
      prisma.post.findMany({
        where: { writer_id: userId },
        take: 10,
        orderBy: {
          id: "desc",
        },
        ...(lastId !== undefined && {
          cursor: {
            id: lastId,
          },
          skip: 1,
        }),
        omit: {
          content: true,
          post_state: true,
        },
      })
    );

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : lastId ?? 0n;
    return {
      postSummaries: posts,
      metadata: {
        lastId: newLastId,
      },
    };
  }

  static async searchPostPages(
    keyword: string,
    lastId?: bigint
  ): Promise<PostPageDto> {
    const posts = await withPrismaError(() =>
      prisma.post.findMany({
        where: { title: { startsWith: keyword } },
        take: 10,
        orderBy: {
          id: "desc",
        },
        ...(lastId !== undefined && {
          cursor: {
            id: lastId,
          },
          skip: 1,
        }),
        omit: {
          content: true,
          post_state: true,
        },
      })
    );

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : lastId ?? 0n;
    return {
      postSummaries: posts,
      metadata: {
        lastId: newLastId,
      },
    };
  }
}
