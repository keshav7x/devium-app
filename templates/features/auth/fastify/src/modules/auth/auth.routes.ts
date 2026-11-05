import type { FastifyInstance } from "fastify";
import { consumeAuthAttempt } from "./auth.rate-limit.js";
import {
  getUserFromToken,
  loginUser,
  registerUser,
} from "./auth.service.js";
import {
  loginSchema,
  registerSchema,
} from "./auth.validation.js";

function bearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7) || undefined;
}

function sessionKey(
  prefix: string,
  ip: string | undefined,
  email: string,
): string {
  return `${prefix}:${ip ?? "unknown"}:${email}`;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/register", async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: result.error.issues,
      });
    }

    const email = result.data.email.trim().toLowerCase();
    if (!consumeAuthAttempt(sessionKey("register", request.ip, email))) {
      return reply.code(429).send({ error: "Too many attempts" });
    }

    const outcome = await registerUser(result.data);
    if (!outcome.ok) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    return reply.code(201).send({ token: outcome.token, user: outcome.user });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: result.error.issues,
      });
    }

    const email = result.data.email.trim().toLowerCase();
    if (!consumeAuthAttempt(sessionKey("login", request.ip, email))) {
      return reply.code(429).send({ error: "Too many attempts" });
    }

    const outcome = await loginUser(result.data);
    if (!outcome.ok) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.code(200).send({ token: outcome.token, user: outcome.user });
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    return reply.code(204).send();
  });

  app.get("/api/auth/me", async (request, reply) => {
    const user = await getUserFromToken(
      bearerToken(request.headers.authorization),
    );
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    return reply.code(200).send({ user });
  });
}
