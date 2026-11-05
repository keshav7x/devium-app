import { describe, expect, it } from "vitest";
import type { ProjectConfig } from "../types/project";
import { buildRegistrySource } from "./registry";

function config(overrides: Partial<ProjectConfig["features"]> = {}, framework: "express" | "fastify" = "express"): ProjectConfig {
  return {
    name: "test-app",
    framework,
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
      ...overrides,
    },
  };
}

describe("buildRegistrySource", () => {
  it("generates a minimal express registry without leftover markers", () => {
    const source = buildRegistrySource(config());
    expect(source).toContain("export function registerModules");
    expect(source).toContain("registerErrorHandler");
    expect(source).toContain("console.error(err)");
    expect(source).not.toContain("{{");
    expect(source).not.toContain("cors");
  });

  it("wires logger, cors, zod and errorClass for express", () => {
    const source = buildRegistrySource(
      config({ logger: true, cors: true, zod: true, errorClass: true }),
    );
    expect(source).toContain('import { requestLogger } from "./requestLogger.js";');
    expect(source).toContain('import { corsMiddleware } from "./cors.js";');
    expect(source).toContain('import { demoRoutes } from "./demoRoutes.js";');
    expect(source).toContain('import { AppError } from "../utils/errors.js";');
    expect(source).toContain("app.use(requestLogger);");
    expect(source).toContain("app.use(corsMiddleware);");
    expect(source).toContain("app.use(demoRoutes);");
    expect(source).toContain("err instanceof AppError");
    expect(source).toContain("logger.error({ err }, \"Unhandled error\")");
  });

  it("generates a minimal fastify registry", () => {
    const source = buildRegistrySource(config({}, "fastify"));
    expect(source).toContain("export const fastifyOptions: FastifyServerOptions = {};");
    expect(source).toContain("export async function registerModules");
    expect(source).toContain("app.log.error({ err }, \"Unhandled error\")");
  });

  it("spreads loggerOptions and registers cors + demo routes for fastify", () => {
    const source = buildRegistrySource(
      config({ logger: true, cors: true, zod: true, errorClass: true }, "fastify"),
    );
    expect(source).toContain("...loggerOptions,");
    expect(source).toContain("await registerCors(app);");
    expect(source).toContain("await registerDemoRoutes(app);");
    expect(source).toContain("err instanceof AppError");
  });
});
