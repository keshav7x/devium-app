export type Framework = "express" | "fastify";
export type Runtime = "node" | "bun";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type ORM = "drizzle" | "prisma";
export type Feature = "logger" | "cors" | "errorClass" | "zod" | "docker";

export interface FeatureFlags {
  logger: boolean;
  cors: boolean;
  errorClass: boolean;
  zod: boolean;
  docker: boolean;
}

export interface ProjectConfig {
  name: string;
  framework: Framework;
  runtime: Runtime;
  packageManager: PackageManager;
  orm: ORM;
  skipInstall: boolean;
  features: FeatureFlags;
}

export interface ManifestLayer {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}
