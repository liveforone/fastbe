type TokenType = "access" | "refresh";

interface BaseTokenPayload {
  id: string;
  typ: TokenType;
}

export type AccessTokenPayload = BaseTokenPayload & {
  typ: "access";
};

export type RefreshTokenPayload = BaseTokenPayload & {
  typ: "refresh";
};

export function createTokenPayload<T extends TokenType>(
  id: string,
  typ: T
): BaseTokenPayload & { typ: T } {
  return { id, typ };
}
