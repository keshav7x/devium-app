import { afterEach, beforeEach, describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { copyTemplate } from "../src/generators/copy-template";
import { mergePackage } from "../src/generators/merge-package";
import { makeConfig } from "./helpers";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "devium-merge-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function readJson(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

describe("mergePackage", () => {
  test("merges express + drizzle manifests and sets the project name", async () => {
    const config = makeConfig({ name: "merged-app", orm: "drizzle" });
    await copyTemplate(config, tempDir);
    await mergePackage(config, tempDir);

    const pkg = await readJson(path.join(tempDir, "package.json"));

    expect(pkg.name).toBe("merged-app");
    expect(pkg.type).toBe("module");
    expect(pkg.dependencies.express).toBeDefined();
    expect(pkg.dependencies["drizzle-orm"]).toBeDefined();
    expect(pkg.dependencies.postgres).toBeDefined();
    expect(pkg.dependencies.zod).toBeUndefined();
    expect(pkg.devDependencies["@types/express"]).toBeDefined();
    expect(pkg.devDependencies["drizzle-kit"]).toBeDefined();
    expect(pkg.scripts.dev).toBe("tsx watch src/server.ts");
    expect(pkg.scripts.build).toBe("tsc");
    expect(pkg.scripts.start).toBe("node dist/server.js");
    expect(pkg.scripts["db:generate"]).toBe("drizzle-kit generate");
    expect(pkg.devDependencies.tsx).toBeDefined();
  });

  test("merges fastify + prisma manifests with runtime scripts", async () => {
    const config = makeConfig({
      name: "fast-prisma",
      framework: "fastify",
      runtime: "bun",
      packageManager: "bun",
      orm: "prisma",
    });
    await copyTemplate(config, tempDir);
    await mergePackage(config, tempDir);

    const pkg = await readJson(path.join(tempDir, "package.json"));

    expect(pkg.dependencies.fastify).toBeDefined();
    expect(pkg.dependencies["@prisma/client"]).toBeDefined();
    expect(pkg.dependencies["@prisma/adapter-pg"]).toBeDefined();
    expect(pkg.devDependencies.prisma).toBeDefined();
    expect(pkg.scripts.dev).toBe("bun --watch src/server.ts");
    expect(pkg.scripts.start).toBe("bun dist/server.js");
    expect(pkg.devDependencies.tsx).toBeUndefined();
    expect(pkg.scripts["db:migrate"]).toBe("prisma migrate dev");
    expect(pkg.scripts.postinstall).toBe("prisma generate");
  });

  test("merges selected feature dependencies", async () => {
    const config = makeConfig({
      features: {
        logger: true,
        cors: true,
        env: true,
        errorClass: false,
        zod: true,
        auth: false,
        rateLimit: false,
        docker: false,
      },
    });
    await copyTemplate(config, tempDir);
    await mergePackage(config, tempDir);

    const pkg = await readJson(path.join(tempDir, "package.json"));

    expect(pkg.dependencies.pino).toBeDefined();
    expect(pkg.dependencies["pino-http"]).toBeDefined();
    expect(pkg.dependencies.cors).toBeDefined();
    expect(pkg.dependencies.zod).toBeDefined();
    expect(pkg.devDependencies["@types/cors"]).toBeDefined();
    expect(pkg.dependencies["@fastify/cors"]).toBeUndefined();
  });

  test("does not leave placeholder names", async () => {
    const config = makeConfig({ name: "real-name" });
    await copyTemplate(config, tempDir);
    await mergePackage(config, tempDir);

    const pkg = await readJson(path.join(tempDir, "package.json"));
    expect(pkg.name).toBe("real-name");
    expect(JSON.stringify(pkg)).not.toContain("{{projectName}}");
  });
});
