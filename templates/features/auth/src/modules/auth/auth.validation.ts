import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(320);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email,
  password: z.string().min(12, "Password must be at least 12 characters").max(256),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(256),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
