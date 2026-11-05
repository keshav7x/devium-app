import jwt from "jsonwebtoken";

const TOKEN_TTL_SECONDS = 60 * 60;

export type AuthTokenPayload = {
  sub: string;
  tokenVersion: number;
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is required and must be at least 32 characters.",
    );
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign({ sub: payload.sub, tv: payload.tokenVersion }, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

function toPayload(payload: unknown): AuthTokenPayload | null {
  if (typeof payload !== "object" || payload === null) return null;

  const { sub, tv } = payload as { sub?: unknown; tv?: unknown };
  if (typeof sub !== "string" || typeof tv !== "number") return null;

  return { sub, tokenVersion: tv };
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret(), {
      algorithms: ["HS256"],
    });
    return toPayload(payload);
  } catch {
    return null;
  }
}
