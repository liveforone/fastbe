import { FastifyInstance } from "fastify";
import { authGuard } from "../../plugins/auth.guard.js";
import {
  createTokenPayload,
  RefreshTokenPayload,
} from "../../type/payload.type.js";
import { AuthUser } from "../../type/authUser.type.js";
import { Signup } from "../api/signup.api.js";
import { Login } from "../api/login.api.js";
import { Refresh } from "../api/refresh.api.js";
import { Logout } from "../api/logout.api.js";
import { UpdatePassword } from "../api/update-password.api.js";
import { UsersService } from "../service/users.service.js";

export function createUsersController(usersService: UsersService) {
  return async function UsersController(app: FastifyInstance) {
    app.post<{ Body: Signup.Request }>(Signup.PATH, async (req, reply) => {
      const parsedBody = Signup.RequestSchema.parse(req.body);
      await usersService.signup(parsedBody);
      reply.status(201).send({ ok: true } satisfies Signup.Response);
    });

    app.post<{ Body: Login.Request }>(Login.PATH, async (req, reply) => {
      const user = await usersService.login(req.body);

      const accessPayload = createTokenPayload(user.id, "access");
      const accessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

      const refreshPayload = createTokenPayload(user.id, "refresh");
      const refreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

      await usersService.saveRefreshToken(user.id, refreshToken);

      reply
        .setCookie(Login.COOKIE_NAME, refreshToken, {
          httpOnly: true,
          secure: false, //https -> true
          sameSite: "lax", //cross-site -> none + secure=true
          path: "/users",
        } satisfies Login.CookieOptions)
        .send({ ok: true, accessToken: accessToken } satisfies Login.Response);
    });

    app.post(Refresh.PATH, async (req, reply) => {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return reply
          .status(401)
          .send({ ok: false, error: "Refresh Token Not Found" });
      }

      let payload: RefreshTokenPayload;
      try {
        payload = app.jwt.verify<any>(refreshToken);
      } catch {
        return reply
          .status(401)
          .send({ ok: false, error: "Invalid refresh token" });
      }
      await usersService.validRefreshToken(payload.id, refreshToken);

      const user = await usersService.getUsersById(payload.id);

      const accessPayload = createTokenPayload(user.id, "access");
      const newAccessToken = app.jwt.sign(accessPayload, { expiresIn: "15m" });

      const refreshPayload = createTokenPayload(user.id, "refresh");
      const newRefreshToken = app.jwt.sign(refreshPayload, { expiresIn: "7d" });

      await usersService.saveRefreshToken(user.id, newRefreshToken);

      reply
        .setCookie(Refresh.COOKIE_NAME, newRefreshToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/users",
        } satisfies Refresh.CookieOptions)
        .send({
          ok: true,
          accessToken: newAccessToken,
        } satisfies Refresh.Response);
    });

    app.post(Logout.PATH, async (req, reply) => {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return reply.status(401).send({ ok: false, error: "No RefreshToken" });
      }

      try {
        const payload = app.jwt.verify<any>(refreshToken);
        await usersService.removeRefreshToken(payload.id);
      } catch {
        return reply
          .status(401)
          .send({ ok: false, error: "Invalid refresh token" });
      }

      reply.clearCookie(Logout.COOKIE_NAME, {
        path: "/users",
      } satisfies Logout.CookieOptions);

      reply.send({ ok: true } satisfies Logout.Response);
    });

    app.patch<{ Body: UpdatePassword.Request }>(
      UpdatePassword.PATH,
      { preHandler: authGuard },
      async (req, reply) => {
        const { id } = req.user as AuthUser;
        await usersService.updatePassword(req.body, id);

        reply.send({ ok: true } satisfies UpdatePassword.Response);
      },
    );
  };
}
