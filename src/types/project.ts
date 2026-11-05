export type Framework = "express" | "fastify";
export type Runtime = "node" | "bun";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type ORM = "drizzle" | "prisma";

export type FeatureKey =
  | "logger"
  | "cors"
  | "env"
  | "errorClass"
  | "zod"
  | "docker";

export type Features = Record<FeatureKey, boolean>;

export interface ProjectConfig {
  name: string;
  framework: Framework;
  runtime: Runtime;
  packageManager: PackageManager;
  orm: ORM;
  skipInstall?: boolean;
  features: Features;
}

export const FEATURE_KEYS: readonly FeatureKey[] = [
  "logger",
  "cors",
  "env",
  "errorClass",
  "zod",
  "docker",
] as const;

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  logger: "Logger (Pino)",
  cors: "CORS",
  env: "Environment validation (Zod)",
  errorClass: "Custom error classes",
  zod: "Request validation (Zod)",
  docker: "Docker configuration",
};

export function buildFeatures(selected: readonly FeatureKey[]): Features {
  return {
    logger: selected.includes("logger"),
    cors: selected.includes("cors"),
    env: selected.includes("env"),
    errorClass: selected.includes("errorClass"),
    zod: selected.includes("zod"),
    docker: selected.includes("docker"),
  };
}
