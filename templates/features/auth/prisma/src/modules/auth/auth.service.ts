import { prisma } from "../../db/index.js";
import { hashPassword, verifyPassword } from "./auth.password.js";
import { signAuthToken, verifyAuthToken } from "./auth.token.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

export type AuthResult =
  | { ok: true; user: AuthUser; token: string }
  | { ok: false; reason: "email_taken" | "invalid_credentials" };

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: unknown }).code;
  return code === "23505" || code === "P2002";
}

const TIMING_SAFE_PASSWORD_HASH = "AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAA==";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return { ok: false, reason: "email_taken" };
  }

  const passwordHash = await hashPassword(input.password);
  let user: AuthUser;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name?.trim() || null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "email_taken" };
    }
    throw error;
  }

  return {
    ok: true,
    user: toAuthUser(user),
    token: signAuthToken({ sub: user.id, tokenVersion: user.tokenVersion }),
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  const passwordHash = user?.passwordHash ?? TIMING_SAFE_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(input.password, passwordHash);

  if (!user || !passwordMatches) {
    return { ok: false, reason: "invalid_credentials" };
  }

  return {
    ok: true,
    user: toAuthUser(user),
    token: signAuthToken({ sub: user.id, tokenVersion: user.tokenVersion }),
  };
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.tokenVersion !== payload.tokenVersion) return null;

  return toAuthUser(user);
}

export async function revokeAuthToken(token: string | undefined): Promise<void> {
  if (!token) return;

  const payload = verifyAuthToken(token);
  if (!payload) return;

  await prisma.user.updateMany({
    where: { id: payload.sub },
    data: { tokenVersion: { increment: 1 } },
  });
}
