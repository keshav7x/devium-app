import jwt from "jsonwebtoken";

const TOKEN_TTL_SECONDS = 60 * 60;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is required and must be at least 32 characters.",
    );
  }
  return secret;
}

export function signAuthToken(payload: { sub: string; email: string }): string {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifyAuthToken(token: string): { sub: string; email: string } | null {
  try {
    const payload = jwt.verify(token, jwtSecret());
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }
    return { sub: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
