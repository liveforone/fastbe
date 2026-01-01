import { FastifyInstance } from "fastify";
import { assertSignupDto } from "../dto/auth/signup.dto.js";
import { assertLoginDto } from "../dto/auth/login.dto.js";
import { authGuard } from "../plugins/auth.guard.js";
import { assertUpdatePasswordDto } from "../dto/auth/updatePassword.dto.js";
import { AuthService } from "../services/auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", async (req, reply) => {
    assertSignupDto(req.body);
    await AuthService.signup(req.body);
    reply.send({ ok: true });
  });

  app.post("/login", async (req, reply) => {
    assertLoginDto(req.body);
    const user = await AuthService.login(req.body);
    const accessToken = app.jwt.sign(
      { username: user.username },
      { expiresIn: "15m" }
    );

    const refreshToken = app.jwt.sign(
      { username: user.username },
      { expiresIn: "7d" }
    );

    await AuthService.saveRefreshToken(user.username, refreshToken);

    reply
      .setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false, //https -> true
        sameSite: "lax", //cross-site -> none + secure=true
        path: "/auth",
      })
      .send({ accessToken });
  });

  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return reply.status(401).send({ error: "Refresh Token Not Found" });
    }

    let payload: { username: string };
    try {
      payload = app.jwt.verify<any>(refreshToken);
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
    await AuthService.validRefreshToken(payload.username, refreshToken);

    const user = await AuthService.getUsersByUsername(payload.username);
    const newAccessToken = app.jwt.sign(
      { username: user.username },
      { expiresIn: "15m" }
    );

    const newRefreshToken = app.jwt.sign(
      { username: user.username },
      { expiresIn: "7d" }
    );
    await AuthService.saveRefreshToken(user.username, newRefreshToken);

    reply
      .setCookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/auth",
      })
      .send({ accessToken: newAccessToken });
  });

  app.post("/logout", async (req, reply) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return reply.status(401).send({ error: "No RefreshToken" });
    }

    try {
      const payload = app.jwt.verify<any>(refreshToken);
      await AuthService.removeRefreshToken(payload.username);
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }

    reply.clearCookie("refreshToken", {
      path: "/auth",
    });

    reply.send({ ok: true });
  });

  app.patch(
    "/update/password",
    { preHandler: authGuard },
    async (req, reply) => {
      assertUpdatePasswordDto(req.body);

      const { username } = req.user as { username: string };
      await AuthService.updatePassword(req.body, username);

      reply.send({ ok: true });
    }
  );
}
