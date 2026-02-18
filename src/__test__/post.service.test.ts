import { Signup } from "../users/api/signup.api.js";
import { redis } from "../config/redis.js";
import { GlobalError } from "../errors/global.error.js";
import { UsersService } from "../users/service/users.service.js";
import { createDB } from "../database/database.js";
import { PostRepository } from "../post/repository/post.repository.js";
import { PostService } from "../post/service/post.service.js";
import { UsersRepository } from "../users/repository/users.repository.js";
import { CreatePost } from "../post/api/create-post.api.js";
import { UpdatePost } from "../post/api/update-post.api.js";

describe("PostService Unit Test(Real DB / Redis)", () => {
  const db = createDB();
  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);
  const postRepository = new PostRepository(db);
  const postService = new PostService(postRepository);

  beforeEach(async () => {
    await db.deleteFrom("users").execute();
    await db.deleteFrom("post").execute();
    await redis.flushall();
  });

  afterAll(async () => {
    await db.deleteFrom("users").execute();
    await db.deleteFrom("post").execute();
    await redis.flushall();
    await redis.quit();
  });

  it("Create Post Test [Success]", async () => {
    const username = "create_post_test";
    const password = "create_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await usersService.signup(signupDto);

    const title = "create_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await postService.createPost(createPostDto, user.id);

    const post = await postService.getPostById(postId);
    expect(post.id).toBe(postId);
  });

  it("Create Post Test [Fail - Wrong id]", async () => {
    const username = "create_post_fail_test";
    const password = "create_post_fail_test_password";
    const signupDto: Signup.Request = { username, password };
    await usersService.signup(signupDto);

    const title = "create_post_fail_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    await expect(
      postService.createPost(createPostDto, "worng_userId"),
    ).rejects.toThrow("FOREIGN_KEY_VIOLATION");
  });

  it("Update Post Test [Success]", async () => {
    const username = "update_post_test";
    const password = "update_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await usersService.signup(signupDto);

    const title = "update_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await postService.createPost(createPostDto, user.id);

    const updatedTitle = "updated_title";
    const updatedContent = "updated_content";
    const updatePostDto: UpdatePost.Request = {
      title: updatedTitle,
      content: updatedContent,
    };
    await postService.updatePost(updatePostDto, postId, user.id);
    const post = await postService.getPostById(postId);
    expect(post.title).toBe(updatedTitle);
    expect(post.content).toBe(updatedContent);
  });

  it("Remove Post Test [Success]", async () => {
    const username = "remove_post_test";
    const password = "remove_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await usersService.signup(signupDto);

    const title = "remove_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await postService.createPost(createPostDto, user.id);

    await postService.removePost(postId, user.id);
    await expect(postService.getPostById(postId)).rejects.toBeInstanceOf(
      GlobalError,
    );
  });
});
