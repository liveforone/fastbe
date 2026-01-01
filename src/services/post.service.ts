import { prisma } from "../config/prisma.js";
import { CreatePostDto } from "../dto/post/createPost.dto.js";
import { PostInfoDto, toPostInfoDto } from "../dto/post/postInfo.dto.js";
import { PostPageDto } from "../dto/post/postPage.dto.js";
import { toPostSummaryDto } from "../dto/post/postSummary.dto.js";
import { UpdatePostDto } from "../dto/post/updatePost.dto.js";
import { withPrismaError } from "../errors/prismaError.handle.js";

export class PostService {
  static async createPost(
    createPostDto: CreatePostDto,
    username: string
  ): Promise<bigint> {
    const { title, content } = createPostDto;
    const user = await withPrismaError(() =>
      prisma.users.findUniqueOrThrow({ where: { username: username } })
    );
    const post = await withPrismaError(() =>
      prisma.post.create({ data: { title, content, writer_id: user.id } })
    );

    return post.id;
  }

  static async updatePost(
    updatePostDto: UpdatePostDto,
    id: bigint,
    username: string
  ) {
    const { title, content } = updatePostDto;
    await withPrismaError(() =>
      prisma.post.updateMany({
        where: {
          id: id,
          writer: {
            username: username,
          },
        },
        data: {
          title: title,
          content: content,
          post_state: "EDITED",
        },
      })
    );
  }

  static async removePost(id: bigint, username: string) {
    await withPrismaError(() =>
      prisma.post.deleteMany({
        where: {
          id: id,
          writer: {
            username: username,
          },
        },
      })
    );
  }

  static async getPostById(id: bigint): Promise<PostInfoDto> {
    const post = await withPrismaError(() =>
      prisma.post.findUniqueOrThrow({
        where: { id: id },
        include: {
          writer: true,
        },
      })
    );

    return toPostInfoDto(post);
  }

  /**
   * You have to setReplySerializer setting in server.ts
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
        include: {
          writer: {
            select: {
              username: true,
            },
          },
        },
        omit: {
          content: true,
          post_state: true,
        },
      })
    );
    const postSummaries = posts.map(toPostSummaryDto);

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : lastId ?? 0n;
    return {
      postSummaries: postSummaries,
      metadata: {
        lastId: newLastId,
      },
    };
  }

  static async getPostPagesByWriter(
    username: string,
    lastId?: bigint
  ): Promise<PostPageDto> {
    const posts = await withPrismaError(() =>
      prisma.post.findMany({
        where: { writer: { username: username } },
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
        include: {
          writer: {
            select: {
              username: true,
            },
          },
        },
        omit: {
          content: true,
          post_state: true,
        },
      })
    );
    const postSummaries = posts.map(toPostSummaryDto);

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : lastId ?? 0n;
    return {
      postSummaries: postSummaries,
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
        include: {
          writer: {
            select: {
              username: true,
            },
          },
        },
        omit: {
          content: true,
          post_state: true,
        },
      })
    );
    const postSummaries = posts.map(toPostSummaryDto);

    const newLastId =
      posts.length > 0 ? posts[posts.length - 1].id : lastId ?? 0n;
    return {
      postSummaries: postSummaries,
      metadata: {
        lastId: newLastId,
      },
    };
  }
}
