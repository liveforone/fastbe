import { FastifyInstance } from "fastify";
import { assertSignupDto } from "../dto/auth/signup.dto.js";
import { assertLoginDto } from "../dto/auth/login.dto.js";
import { authGuard } from "../plugins/auth.guard.js";
import { assertUpdatePasswordDto } from "../dto/auth/updatePassword.dto.js";
import { AuthService } from "../services/auth.service.js";
import {
  createTokenPayload,
  RefreshTokenPayload,
} from "../type/payload.type.js";
import { AuthUser } from "../type/authUser.type.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/signup", async (req, reply) => {
    assertSignupDto(req.body);
    await AuthService.signup(req.body);
    reply.send({ ok: true });
  });

  app.post("/login", async (req, reply) => {
    assertLoginDto(req.body);

    const user = await AuthService.login(req.body);

    const accessPayload = createTokenPayload(user.id, "access");
    const accessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

    const refreshPayload = createTokenPayload(user.id, "refresh");
    const refreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

    await AuthService.saveRefreshToken(user.id, refreshToken);

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

    let payload: RefreshTokenPayload;
    try {
      payload = app.jwt.verify<any>(refreshToken);
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
    await AuthService.validRefreshToken(payload.id, refreshToken);

    const user = await AuthService.getUsersById(payload.id);

    const accessPayload = createTokenPayload(user.id, "access");
    const newAccessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

    const refreshPayload = createTokenPayload(user.id, "refresh");
    const newRefreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

    await AuthService.saveRefreshToken(user.id, newRefreshToken);

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
      await AuthService.removeRefreshToken(payload.id);
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

      const { id } = req.user as AuthUser;
      await AuthService.updatePassword(req.body, id);

      reply.send({ ok: true });
    }
  );
}
