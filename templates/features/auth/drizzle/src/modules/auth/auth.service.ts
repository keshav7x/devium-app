import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
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

const TIMING_SAFE_PASSWORD_HASH = "AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAA==";

function toAuthUser(user: typeof users.$inferSelect): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { ok: false, reason: "email_taken" };
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: input.name?.trim() || null,
    })
    .returning();

  if (!user) {
    throw new Error("Unable to create user");
  }

  return {
    ok: true,
    user: toAuthUser(user),
    token: signAuthToken({ sub: user.id, email: user.email }),
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const passwordHash = user?.passwordHash ?? TIMING_SAFE_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(input.password, passwordHash);

  if (!user || !passwordMatches) {
    return { ok: false, reason: "invalid_credentials" };
  }

  return {
    ok: true,
    user: toAuthUser(user),
    token: signAuthToken({ sub: user.id, email: user.email }),
  };
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  return user ? toAuthUser(user) : null;
}
