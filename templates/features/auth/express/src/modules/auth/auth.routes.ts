import { Router } from "express";
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

export const authRoutes = Router();

function bearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7) || undefined;
}

function sessionKey(prefix: string, ip: string | undefined, email: string): string {
  return `${prefix}:${ip ?? "unknown"}:${email}`;
}

authRoutes.post("/api/auth/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.issues,
    });
    return;
  }

  const email = result.data.email.trim().toLowerCase();
  if (!consumeAuthAttempt(sessionKey("register", req.ip, email))) {
    res.status(429).json({ error: "Too many attempts" });
    return;
  }

  const outcome = await registerUser(result.data);
  if (!outcome.ok) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  res.status(201).json({ token: outcome.token, user: outcome.user });
});

authRoutes.post("/api/auth/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.issues,
    });
    return;
  }

  const email = result.data.email.trim().toLowerCase();
  if (!consumeAuthAttempt(sessionKey("login", req.ip, email))) {
    res.status(429).json({ error: "Too many attempts" });
    return;
  }

  const outcome = await loginUser(result.data);
  if (!outcome.ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.status(200).json({ token: outcome.token, user: outcome.user });
});

authRoutes.post("/api/auth/logout", (_req, res) => {
  res.status(204).send();
});

authRoutes.get("/api/auth/me", async (req, res) => {
  const user = await getUserFromToken(bearerToken(req.headers.authorization));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.status(200).json({ user });
});
