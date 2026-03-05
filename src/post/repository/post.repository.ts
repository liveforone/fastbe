import { CreatePost } from "../api/create-post.api.js";
import { UpdatePost } from "../api/update-post.api.js";
import { BaseRepository } from "../../database/base.repository.js";

export class PostRepository extends BaseRepository {
  private readonly PAGE_LIMIT_SIZE = 10;

  async savePost(createPostDto: CreatePost.Request, userId: string) {
    const { title, content } = createPostDto;
    return this.executeOne(() =>
      this.db
        .insertInto("post")
        .values({
          title,
          content,
          writer_id: userId,
          post_state: "ORIGINAL",
        })
        .returningAll()
        .executeTakeFirst(),
    );
  }

  async updatePostByIdAndWriterId(
    updatePostDto: UpdatePost.Request,
    id: bigint,
    userId: string,
  ) {
    const { title, content } = updatePostDto;
    return this.executeMutation(() =>
      this.db
        .updateTable("post")
        .set({
          title,
          content,
          post_state: "EDITED",
        })
        .where("id", "=", id)
        .where("writer_id", "=", userId)
        .executeTakeFirst(),
    );
  }

  async deletePostByIdAndWriterId(id: bigint, userId: string) {
    return this.executeMutation(() =>
      this.db
        .deleteFrom("post")
        .where("id", "=", id)
        .where("writer_id", "=", userId)
        .executeTakeFirst(),
    );
  }

  async findPostById(id: bigint) {
    return this.executeOne(() =>
      this.db
        .selectFrom("post")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirst(),
    );
  }

  async findAllPostPages(lastId?: bigint) {
    return this.executeQuery(async () => {
      let query = this.db
        .selectFrom("post")
        .select(["id", "title", "writer_id", "created_date"])
        .orderBy("id", "desc")
        .limit(this.PAGE_LIMIT_SIZE + 1);

      if (lastId !== undefined) {
        query = query.where("id", "<", lastId);
      }

      return query.execute();
    });
  }

  async findPostPagesByWriterId(userId: string, lastId?: bigint) {
    return this.executeQuery(async () => {
      let query = this.db
        .selectFrom("post")
        .where("writer_id", "=", userId)
        .select(["id", "title", "writer_id", "created_date"])
        .orderBy("id", "desc")
        .limit(this.PAGE_LIMIT_SIZE + 1);

      if (lastId !== undefined) {
        query = query.where("id", "<", lastId);
      }

      return query.execute();
    });
  }

  async searchPostPagesByTitle(keyword: string, lastId?: bigint) {
    return this.executeQuery(async () => {
      let query = this.db
        .selectFrom("post")
        .where("title", "like", `${keyword}%`)
        .select(["id", "title", "writer_id", "created_date"])
        .orderBy("id", "desc")
        .limit(this.PAGE_LIMIT_SIZE + 1);

      if (lastId !== undefined) {
        query = query.where("id", "<", lastId);
      }

      return query.execute();
    });
  }
}
