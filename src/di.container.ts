import { FastifyInstance } from "fastify";
import { createDB } from "./database/database.js";
import { createPostController } from "./post/controller/post.controller.js";
import { PostRepository } from "./post/repository/post.repository.js";
import { PostService } from "./post/service/post.service.js";
import { UsersRepository } from "./users/repository/users.repository.js";
import { UsersService } from "./users/service/users.service.js";
import { createUsersController } from "./users/controller/users.controller.js";

export function createDIContainer(app: FastifyInstance) {
  const db = createDB();

  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);
  app.register(createUsersController(usersService), {
    prefix: "/users",
  });

  const postRepository = new PostRepository(db);
  const postService = new PostService(postRepository);
  app.register(createPostController(postService), { prefix: "/posts" });
}
