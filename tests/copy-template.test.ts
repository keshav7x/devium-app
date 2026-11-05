import { afterEach, beforeEach, describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { copyTemplate } from "../src/generators/copy-template";
import { applyFeatures } from "../src/generators/apply-features";
import { makeConfig } from "./helpers";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "devium-copy-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function exists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(tempDir, relPath));
    return true;
  } catch {
    return false;
  }
}

describe("template selection", () => {
  test("copies base + express + drizzle", async () => {
    const config = makeConfig({ framework: "express", orm: "drizzle" });
    await copyTemplate(config, tempDir);

    expect(await exists("package.json")).toBe(true);
    expect(await exists("src/config/env.ts")).toBe(true);
    expect(await exists("src/app.ts")).toBe(true);
    expect(await exists("src/server.ts")).toBe(true);
    expect(await exists("src/db/index.ts")).toBe(true);
    expect(await exists("src/db/schema.ts")).toBe(true);
    expect(await exists("drizzle.config.ts")).toBe(true);

    expect(await exists("prisma.config.ts")).toBe(false);
    expect(await exists("prisma")).toBe(false);
    expect(await exists("node_modules")).toBe(false);
    expect(await exists("bun.lock")).toBe(false);
  });

  test("copies base + fastify + prisma", async () => {
    const config = makeConfig({ framework: "fastify", orm: "prisma" });
    await copyTemplate(config, tempDir);

    expect(await exists("src/app.ts")).toBe(true);
    expect(await exists("src/db/index.ts")).toBe(true);
    expect(await exists("prisma.config.ts")).toBe(true);
    expect(await exists("prisma/schema.prisma")).toBe(true);

    expect(await exists("drizzle.config.ts")).toBe(false);
  });

  test("does not mix ORM files", async () => {
    const config = makeConfig({ orm: "prisma" });
    await copyTemplate(config, tempDir);

    const dbIndex = await fs.readFile(
      path.join(tempDir, "src/db/index.ts"),
      "utf-8"
    );
    expect(dbIndex).toContain("PrismaClient");
    expect(dbIndex).not.toContain("drizzle");

    const prismaPkg = JSON.parse(
      await fs.readFile(path.join(tempDir, "package.json"), "utf-8")
    );
    expect(prismaPkg.dependencies["drizzle-orm"]).toBeUndefined();
  });
});

describe("feature generation", () => {
  test("copies selected feature files and registry", async () => {
    const config = makeConfig({
      orm: "prisma",
      features: {
        logger: true,
        cors: true,
        env: true,
        errorClass: true,
        zod: true,
        docker: true,
      },
    });
    await copyTemplate(config, tempDir);
    await applyFeatures(config, tempDir);

    expect(await exists("src/utils/logger.ts")).toBe(true);
    expect(await exists("src/utils/errors.ts")).toBe(true);
    expect(await exists("src/utils/validate.ts")).toBe(true);
    expect(await exists("src/modules/demoRoutes.ts")).toBe(true);
    expect(await exists("Dockerfile")).toBe(true);
    expect(await exists(".dockerignore")).toBe(true);

    const env = await fs.readFile(
      path.join(tempDir, "src/config/env.ts"),
      "utf-8"
    );
    expect(env).toContain("DATABASE_URL is required");
    expect(env).not.toContain(".optional(),");

    const registry = await fs.readFile(
      path.join(tempDir, "src/modules/index.ts"),
      "utf-8"
    );
    expect(registry).toContain("requestLogger");
    expect(registry).toContain("corsMiddleware");
    expect(registry).toContain("demoRoutes");
    expect(registry).toContain("AppError");
  });

  test("fastify registry exposes fastifyOptions and async registerModules", async () => {
    const config = makeConfig({
      framework: "fastify",
      features: { ...makeConfig().features, logger: true },
    });
    await copyTemplate(config, tempDir);
    await applyFeatures(config, tempDir);

    const registry = await fs.readFile(
      path.join(tempDir, "src/modules/index.ts"),
      "utf-8"
    );
    expect(registry).toContain("export const fastifyOptions");
    expect(registry).toContain("loggerOptions");
    expect(registry).toContain("export async function registerModules");
  });
});
