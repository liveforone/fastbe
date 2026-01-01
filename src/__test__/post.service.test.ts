import { prisma } from "../config/prisma.js";
import { redis } from "../config/redis.js";
import { SignupDto } from "../dto/auth/signup.dto.js";
import { CreatePostDto } from "../dto/post/createPost.dto.js";
import { UpdatePostDto } from "../dto/post/updatePost.dto.js";
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
    const signupDto: SignupDto = { username, password };
    await AuthService.signup(signupDto);

    const title = "create_post_title";
    const content = "test_content";
    const createPostDto: CreatePostDto = { title, content };
    const postId = await PostService.createPost(createPostDto, username);

    const post = await PostService.getPostById(postId);
    expect(post.id).toBe(postId);
  });

  it("Create Post Test [Fail - Wrong username]", async () => {
    const username = "create_post_fail_test";
    const password = "create_post_fail_test_password";
    const signupDto: SignupDto = { username, password };
    await AuthService.signup(signupDto);

    const title = "create_post_fail_title";
    const content = "test_content";
    const createPostDto: CreatePostDto = { title, content };
    await expect(
      PostService.createPost(createPostDto, "worng_username")
    ).rejects.toThrow(
      "[P2025] The error indicates that an operation failed because it depends on one or more records that were required but not found. This typically occurs when there's a dependency between operations, such as when trying to perform an action that relies on the existence of specific records. Review the dependencies and ensure that all required records are present before attempting the operation to avoid this error."
    );
  });

  it("Update Post Test [Success]", async () => {
    const username = "update_post_test";
    const password = "update_post_test_password";
    const signupDto: SignupDto = { username, password };
    await AuthService.signup(signupDto);

    const title = "update_post_title";
    const content = "test_content";
    const createPostDto: CreatePostDto = { title, content };
    const postId = await PostService.createPost(createPostDto, username);

    const updatedTitle = "updated_title";
    const updatedContent = "updated_content";
    const updatePostDto: UpdatePostDto = {
      title: updatedTitle,
      content: updatedContent,
    };
    await PostService.updatePost(updatePostDto, postId, username);
    const post = await PostService.getPostById(postId);
    expect(post.title).toBe(updatedTitle);
    expect(post.content).toBe(updatedContent);
  });

  it("Remove Post Test [Success]", async () => {
    const username = "remove_post_test";
    const password = "remove_post_test_password";
    const signupDto: SignupDto = { username, password };
    await AuthService.signup(signupDto);

    const title = "remove_post_title";
    const content = "test_content";
    const createPostDto: CreatePostDto = { title, content };
    const postId = await PostService.createPost(createPostDto, username);

    await PostService.removePost(postId, username);
    await expect(PostService.getPostById(postId)).rejects.toBeInstanceOf(
      CustomError
    );
  });
});
