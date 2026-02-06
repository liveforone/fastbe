import { Signup } from "../api/auth/signup.api.js";
import { CreatePost } from "../api/post/create-post.api.js";
import { UpdatePost } from "../api/post/update-post.api.js";
import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { CustomError } from "../errors/custom.error.js";
import { AuthService } from "../services/auth.service.js";
import { PostService } from "../services/post.service.js";

describe("PostService Unit Test(Real DB / Redis)", () => {
  beforeEach(async () => {
    await prisma.users.deleteMany();
    await prisma.post.deleteMany();
    await redis.flushall();
  });

  afterAll(async () => {
    await prisma.users.deleteMany();
    await prisma.post.deleteMany();
    await redis.flushall();
    await prisma.$disconnect();
    await redis.quit();
  });

  it("Create Post Test [Success]", async () => {
    const username = "create_post_test";
    const password = "create_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await AuthService.signup(signupDto);

    const title = "create_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await PostService.createPost(createPostDto, user.id);

    const post = await PostService.getPostById(postId);
    expect(post.id).toBe(postId);
  });

  it("Create Post Test [Fail - Wrong id]", async () => {
    const username = "create_post_fail_test";
    const password = "create_post_fail_test_password";
    const signupDto: Signup.Request = { username, password };
    await AuthService.signup(signupDto);

    const title = "create_post_fail_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    await expect(
      PostService.createPost(createPostDto, "worng_userId"),
    ).rejects.toThrow(
      "[P2003] The foreign key constraint has failed because the associated record does not exist in the referenced table. This indicates that the value being inserted or updated in the column with the foreign key constraint does not have a corresponding entry in the related table. Check the integrity of your data and ensure that all foreign key references are valid.",
    );
  });

  it("Update Post Test [Success]", async () => {
    const username = "update_post_test";
    const password = "update_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await AuthService.signup(signupDto);

    const title = "update_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await PostService.createPost(createPostDto, user.id);

    const updatedTitle = "updated_title";
    const updatedContent = "updated_content";
    const updatePostDto: UpdatePost.Request = {
      title: updatedTitle,
      content: updatedContent,
    };
    await PostService.updatePost(updatePostDto, postId, user.id);
    const post = await PostService.getPostById(postId);
    expect(post.title).toBe(updatedTitle);
    expect(post.content).toBe(updatedContent);
  });

  it("Remove Post Test [Success]", async () => {
    const username = "remove_post_test";
    const password = "remove_post_test_password";
    const signupDto: Signup.Request = { username, password };
    const user = await AuthService.signup(signupDto);

    const title = "remove_post_title";
    const content = "test_content";
    const createPostDto: CreatePost.Request = { title, content };
    const postId = await PostService.createPost(createPostDto, user.id);

    await PostService.removePost(postId, user.id);
    await expect(PostService.getPostById(postId)).rejects.toBeInstanceOf(
      CustomError,
    );
  });
});
