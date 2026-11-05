import type { ProjectConfig } from "../src/types/project";

export function makeConfig(
  overrides: Partial<ProjectConfig> = {}
): ProjectConfig {
  return {
    name: "test-project",
    framework: "express",
    runtime: "node",
    packageManager: "npm",
    orm: "drizzle",
    features: {
      logger: false,
      cors: false,
      env: false,
      errorClass: false,
      zod: false,
      docker: false,
    },
    skipInstall: true,
    ...overrides,
  };
}
