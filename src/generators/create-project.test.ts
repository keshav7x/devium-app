import { mkdtemp, readdir, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProjectConfig, FeatureKey } from "../types/project";
import { buildFeatures } from "../types/project";
import { copyTemplate } from "./copy-template";
import { applyFeatures } from "./apply-features";
import { mergePackage } from "./merge-package";
import { createProject } from "./create-project";

function makeConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return {
    name: "sample-app",
    framework: "express",
    runtime: "node",
    packageManager: "npm",
    orm: "drizzle",
    skipInstall: true,
    features: buildFeatures([]),
    ...overrides,
  };
}

const ALL_FEATURES: FeatureKey[] = [
  "logger",
  "cors",
  "env",
  "errorClass",
  "zod",
  "docker",
];

async function collectFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(path.relative(dir, full));
    }
  }
  await walk(dir);
  return out.sort();
}

describe("template generation", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "devium-gen-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("copies express + drizzle without node_modules or bun.lock", async () => {
    const config = makeConfig();
    const target = path.join(tmpDir, config.name);
    await copyTemplate(config, target);

    const files = await collectFiles(target);
    expect(files).toContain("package.json");
    expect(files).toContain("src/app.ts");
    expect(files).toContain("src/server.ts");
    expect(files).toContain("src/config/env.ts");
    expect(files).toContain("src/db/index.ts");
    expect(files).toContain("drizzle.config.ts");
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files).not.toContain("bun.lock");
    expect(files).not.toContain("drizzle.config.ts.bak");
  });

  it("copies prisma schema and prisma.config.ts, not drizzle config", async () => {
    const config = makeConfig({ orm: "prisma" });
    const target = path.join(tmpDir, config.name);
    await copyTemplate(config, target);

    const files = await collectFiles(target);
    expect(files).toContain("prisma/schema.prisma");
    expect(files).toContain("prisma.config.ts");
    expect(files).toContain("src/db/index.ts");
    expect(files).not.toContain("drizzle.config.ts");
  });

  it("generates a full express + drizzle project with all features", async () => {
    const config = makeConfig({
      features: buildFeatures(ALL_FEATURES),
    });
    const target = path.join(tmpDir, config.name);
    await copyTemplate(config, target);
    await applyFeatures(config, target);
    await mergePackage(config, target);

    const files = await collectFiles(target);

    expect(files).toContain("src/modules/index.ts");
    expect(files).toContain("src/utils/logger.ts");
    expect(files).toContain("src/modules/requestLogger.ts");
    expect(files).toContain("src/modules/cors.ts");
    expect(files).toContain("src/utils/errors.ts");
    expect(files).toContain("src/utils/validate.ts");
    expect(files).toContain("src/modules/demoRoutes.ts");
    expect(files).toContain("Dockerfile");
    expect(files).not.toContain("Dockerfile.node");
    expect(files).not.toContain("Dockerfile.bun");

    const registry = await readFile(
      path.join(target, "src/modules/index.ts"),
      "utf8",
    );
    expect(registry).toContain("corsMiddleware");
    expect(registry).toContain("AppError");

    const server = await readFile(path.join(target, "src/server.ts"), "utf8");
    expect(server).toContain('import { client } from "./db/index.js";');
    expect(server).toContain("await client.end();");
    expect(server).not.toContain("{{");

    const env = await readFile(path.join(target, "src/config/env.ts"), "utf8");
    expect(env).toContain("DATABASE_URL must be a postgres://");

    const manifest = JSON.parse(
      await readFile(path.join(target, "package.json"), "utf8"),
    );
    expect(manifest.name).toBe(config.name);
    expect(manifest.type).toBe("module");
    expect(manifest.dependencies).toMatchObject({
      express: expect.any(String),
      "drizzle-orm": expect.any(String),
      postgres: expect.any(String),
      pino: expect.any(String),
      "pino-http": expect.any(String),
      cors: expect.any(String),
      zod: expect.any(String),
    });
    expect(manifest.devDependencies).toMatchObject({
      "drizzle-kit": expect.any(String),
      "pino-pretty": expect.any(String),
      typescript: expect.any(String),
    });
    expect(manifest.scripts["db:migrate"]).toBe(
      "drizzle-kit migrate",
    );
    expect(manifest.scripts.dev).toBe("tsx watch src/server.ts");

    for (const file of [
      "src/modules/index.ts",
      "src/server.ts",
      "README.md",
      "Dockerfile",
    ]) {
      const content = await readFile(path.join(target, file), "utf8");
      expect(content).not.toContain("{{");
      expect(content).not.toContain("<package-manager>");
    }

    const readme = await readFile(path.join(target, "README.md"), "utf8");
    expect(readme).toContain("sample-app");
    expect(readme).toContain("npm install");
  });

  it("generates a full fastify + bun + prisma project", async () => {
    const config = makeConfig({
      framework: "fastify",
      runtime: "bun",
      packageManager: "bun",
      orm: "prisma",
      features: buildFeatures(["logger", "cors", "env", "docker"]),
    });
    const target = path.join(tmpDir, config.name);
    await copyTemplate(config, target);
    await applyFeatures(config, target);
    await mergePackage(config, target);

    const files = await collectFiles(target);
    expect(files).toContain("src/modules/index.ts");
    expect(files).toContain("src/utils/logger.ts");
    expect(files).toContain("src/modules/cors.ts");
    expect(files).toContain("prisma/schema.prisma");
    expect(files).toContain("prisma.config.ts");
    expect(files).toContain("Dockerfile");
    expect(files).not.toContain("src/modules/demoRoutes.ts");
    expect(files).not.toContain("src/utils/errors.ts");

    const registry = await readFile(
      path.join(target, "src/modules/index.ts"),
      "utf8",
    );
    expect(registry).toContain("...loggerOptions,");
    expect(registry).toContain("await registerCors(app);");

    const server = await readFile(path.join(target, "src/server.ts"), "utf8");
    expect(server).toContain('import { prisma } from "./db/index.js";');
    expect(server).toContain("await prisma.$disconnect();");

    const env = await readFile(path.join(target, "src/config/env.ts"), "utf8");
    expect(env).toContain("DATABASE_URL must be a postgres://");

    const manifest = JSON.parse(
      await readFile(path.join(target, "package.json"), "utf8"),
    );
    expect(manifest.dependencies).toMatchObject({
      fastify: expect.any(String),
      "@fastify/cors": expect.any(String),
      "@prisma/client": expect.any(String),
    });
    expect(manifest.scripts.postinstall).toBe("prisma generate");
    expect(manifest.scripts.dev).toBe("bun --watch src/server.ts");
    expect(manifest.scripts.start).toBe("bun dist/server.js");

    const docker = await readFile(path.join(target, "Dockerfile"), "utf8");
    expect(docker).toContain("oven/bun:1-alpine");
    expect(docker).not.toContain("{{");
  });

  it("patches the zod env variant to require DATABASE_URL when an ORM is used", async () => {
    const config = makeConfig({ orm: "prisma", features: buildFeatures(["env"]) });
    const target = path.join(tmpDir, config.name);
    await copyTemplate(config, target);
    await applyFeatures(config, target);

    const env = await readFile(path.join(target, "src/config/env.ts"), "utf8");
    expect(env).toContain("z.string()");
    expect(env).toContain("DATABASE_URL must be a postgres://");
    expect(env).not.toContain(".optional(),");
  });

  it("createProject refuses a non-empty destination directory", async () => {
    const config = makeConfig();
    const target = path.join(tmpDir, config.name);
    await copyTemplate(config, target);
    await expect(createProject(config, tmpDir)).rejects.toThrow(/not empty/);
  });
});
