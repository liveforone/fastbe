import { FastifyInstance } from "fastify";
import { authGuard } from "../plugins/auth.guard.js";
import { AuthService } from "../services/auth.service.js";
import {
  createTokenPayload,
  RefreshTokenPayload,
} from "../type/payload.type.js";
import { AuthUser } from "../type/authUser.type.js";
import { Signup } from "../api/auth/signup.api.js";
import { Login } from "../api/auth/login.api.js";
import { Refresh } from "../api/auth/refresh.api.js";
import { Logout } from "../api/auth/logout.api.js";
import { UpdatePassword } from "../api/auth/update-password.api.js";

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: Signup.Request }>(Signup.PATH, async (req, reply) => {
    const parsedBody = Signup.RequestSchema.parse(req.body);
    await AuthService.signup(parsedBody);
    reply.send({ ok: true });
  });

  app.post<{ Body: Login.Request }>(Login.PATH, async (req, reply) => {
    const user = await AuthService.login(req.body);

    const accessPayload = createTokenPayload(user.id, "access");
    const accessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

    const refreshPayload = createTokenPayload(user.id, "refresh");
    const refreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

    await AuthService.saveRefreshToken(user.id, refreshToken);

    reply
      .setCookie(Login.COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: false, //https -> true
        sameSite: "lax", //cross-site -> none + secure=true
        path: "/auth",
      } satisfies Login.CookieOptions)
      .send({ accessToken });
  });

  app.post(Refresh.PATH, async (req, reply) => {
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
      .setCookie(Refresh.COOKIE_NAME, newRefreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/auth",
      } satisfies Refresh.CookieOptions)
      .send({ accessToken: newAccessToken });
  });

  app.post(Logout.PATH, async (req, reply) => {
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

    reply.clearCookie(Logout.COOKIE_NAME, {
      path: "/auth",
    } satisfies Logout.CookieOptions);

    reply.send({ ok: true });
  });

  app.patch<{ Body: UpdatePassword.Request }>(
    UpdatePassword.PATH,
    { preHandler: authGuard },
    async (req, reply) => {
      const { id } = req.user as AuthUser;
      await AuthService.updatePassword(req.body, id);

      reply.send({ ok: true });
    },
  );
}
