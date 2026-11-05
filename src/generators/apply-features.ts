import { report } from "../ui/reporter";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";
import { buildRegistrySource } from "./registry";
import { applyLineMarkers, hasUnresolvedMarkers } from "./markers";
import { writeDockerfile } from "./docker";
import { getTemplatesDir } from "../utils/paths";

const FEATURE_LAYER_DIRS = new Set(["express", "fastify", "drizzle", "prisma"]);
const FEATURE_ORDER = [
  "logger",
  "cors",
  "env",
  "errorClass",
  "zod",
  "auth",
  "rateLimit",
  "docker",
] as const;

async function overlayFeatureLayer(
  sourceRoot: string,
  targetDir: string,
  skip: (entry: import("node:fs").Dirent) => boolean = () => false,
): Promise<void> {
  if (!existsSync(sourceRoot)) return;

  const filter = (source: string): boolean =>
    path.basename(source) !== "package.json";
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "package.json") continue;
    if (skip(entry)) continue;

    await fs.cp(
      path.join(sourceRoot, entry.name),
      path.join(targetDir, entry.name),
      {
        recursive: true,
        force: true,
        filter,
      },
    );
  }
}

async function overlayFeature(
  feature: string,
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const root = path.join(getTemplatesDir(), "features", feature);
  if (!existsSync(root)) return;

  const skipFeatureLayer = (entry: import("node:fs").Dirent): boolean =>
    entry.isDirectory() && FEATURE_LAYER_DIRS.has(entry.name);

  await overlayFeatureLayer(root, targetDir, skipFeatureLayer);
  await overlayFeatureLayer(path.join(root, config.framework), targetDir);
  await overlayFeatureLayer(path.join(root, config.orm), targetDir);
}

function ormCleanupSnippet(config: ProjectConfig): {
  importLine: string;
  cleanup: string;
} {
  if (config.orm === "drizzle") {
    return {
      importLine: 'import { client } from "./db/index.js";',
      cleanup: "await client.end();",
    };
  }
  return {
    importLine: 'import { prisma } from "./db/index.js";',
    cleanup: "await prisma.$disconnect();",
  };
}

function requireReplacement(
  content: string,
  search: string,
  replacement: string,
  fileLabel: string,
): string {
  if (!content.includes(search)) {
    throw new Error(
      `Expected pattern not found while generating project (${fileLabel}): ${search}`,
    );
  }
  return content.replace(search, replacement);
}

const PLAIN_DATABASE_URL = "const databaseUrl = process.env.DATABASE_URL;";
const PLAIN_DATABASE_URL_REQUIRED = `${PLAIN_DATABASE_URL}
if (!databaseUrl) {
  throw new Error(
    "Missing required environment variable: DATABASE_URL. " +
      "Copy .env.example to .env and set it to your PostgreSQL connection string.",
  );
}`;
const ZOD_DATABASE_URL_OPTIONAL = "DATABASE_URL: z.string().min(1).optional(),";
const ZOD_DATABASE_URL_REQUIRED = `DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => /^postgres(ql)?:\\/\\//.test(value),
      "DATABASE_URL must be a postgres:// or postgresql:// URL",
    ),`;

async function patchPlainEnv(envPath: string, content: string): Promise<void> {
  const patched = requireReplacement(
    content,
    PLAIN_DATABASE_URL,
    PLAIN_DATABASE_URL_REQUIRED,
    "env.ts",
  );
  await fs.writeFile(envPath, patched);
}

async function patchZodEnv(envPath: string, content: string): Promise<void> {
  const patched = requireReplacement(
    content,
    ZOD_DATABASE_URL_OPTIONAL,
    ZOD_DATABASE_URL_REQUIRED,
    "env.ts",
  );
  await fs.writeFile(envPath, patched);
}

const PLAIN_JWT_SECRET_REQUIRED = `const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET environment variable is required and must be at least 32 characters.",
  );
}`;
const PLAIN_REDIS_URL_REQUIRED = `const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error(
    "REDIS_URL environment variable is required for auth rate limiting.",
  );
}`;
const ZOD_HOST_LINE = '  HOST: z.string().min(1).default("localhost"),\n';
const ZOD_JWT_SECRET_REQUIRED =
  '  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),\n';
const ZOD_REDIS_URL_REQUIRED =
  '  REDIS_URL: z.string().min(1, "REDIS_URL is required"),\n';

async function patchPlainEnvRequired(
  envPath: string,
  content: string,
  config: ProjectConfig,
): Promise<void> {
  const checks: string[] = [];

  if (config.features.auth) checks.push(PLAIN_JWT_SECRET_REQUIRED);
  if (config.features.rateLimit) checks.push(PLAIN_REDIS_URL_REQUIRED);
  if (checks.length === 0) return;

  const patched = requireReplacement(
    content,
    PLAIN_DATABASE_URL,
    `${PLAIN_DATABASE_URL}\n${checks.join("\n")}`,
    "env.ts",
  );
  await fs.writeFile(envPath, patched);
}

async function patchZodEnvRequired(
  envPath: string,
  content: string,
  config: ProjectConfig,
): Promise<void> {
  const fields: string[] = [];

  if (config.features.auth) fields.push(ZOD_JWT_SECRET_REQUIRED);
  if (config.features.rateLimit) fields.push(ZOD_REDIS_URL_REQUIRED);
  if (fields.length === 0) return;

  const patched = requireReplacement(
    content,
    ZOD_HOST_LINE,
    `${ZOD_HOST_LINE}${fields.join("")}`,
    "env.ts",
  );
  await fs.writeFile(envPath, patched);
}

async function patchEnvRequired(
  targetDir: string,
  config: ProjectConfig,
): Promise<void> {
  const envPath = path.join(targetDir, "src", "config", "env.ts");
  const content = await fs.readFile(envPath, "utf8");

  if (content.includes(ZOD_HOST_LINE)) {
    return patchZodEnvRequired(envPath, content, config);
  }

  return patchPlainEnvRequired(envPath, content, config);
}

async function patchEnvDatabaseUrl(
  targetDir: string,
  config: ProjectConfig,
): Promise<void> {
  if (config.orm !== "drizzle" && config.orm !== "prisma") return;

  const envPath = path.join(targetDir, "src", "config", "env.ts");
  const content = await fs.readFile(envPath, "utf8");

  if (content.includes(PLAIN_DATABASE_URL)) {
    return patchPlainEnv(envPath, content);
  }

  if (content.includes(ZOD_DATABASE_URL_OPTIONAL)) {
    return patchZodEnv(envPath, content);
  }

  throw new Error(
    "Unable to make DATABASE_URL required: unrecognized env.ts template.",
  );
}

async function patchServerOrm(
  targetDir: string,
  config: ProjectConfig,
): Promise<void> {
  const { importLine, cleanup } = ormCleanupSnippet(config);
  const serverPath = path.join(targetDir, "src", "server.ts");
  const content = await fs.readFile(serverPath, "utf8");
  const patched = applyLineMarkers(content, {
    ormImport: importLine,
    ormCleanup: cleanup,
  });
  await fs.writeFile(serverPath, patched);
}

async function patchReadme(
  targetDir: string,
  config: ProjectConfig,
): Promise<void> {
  const readmePath = path.join(targetDir, "README.md");
  if (!existsSync(readmePath)) return;
  let content = await fs.readFile(readmePath, "utf8");
  content = content.replaceAll("{{projectName}}", config.name);
  content = content.replaceAll("<package-manager>", config.packageManager);
  await fs.writeFile(readmePath, content);
}

async function assertNoLeftoverMarkers(targetDir: string): Promise<void> {
  const candidates = [
    "src/server.ts",
    "src/app.ts",
    "src/config/env.ts",
    "src/modules/index.ts",
    "README.md",
    "Dockerfile",
  ];
  for (const relative of candidates) {
    const filePath = path.join(targetDir, relative);
    if (!existsSync(filePath)) continue;
    const content = await fs.readFile(filePath, "utf8");
    if (hasUnresolvedMarkers(content) || content.includes("<package-manager>")) {
      throw new Error(
        `Unresolved template markers remain in generated file: ${relative}`,
      );
    }
  }
}

export async function applyFeatures(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  for (const feature of FEATURE_ORDER) {
    if (config.features[feature]) {
      await overlayFeature(feature, config, targetDir);
    }
  }

  if (config.features.docker) {
    await writeDockerfile(config, targetDir);
  }

  const registryPath = path.join(targetDir, "src", "modules", "index.ts");
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, buildRegistrySource(config));

  await patchEnvDatabaseUrl(targetDir, config);
  await patchEnvRequired(targetDir, config);
  await patchServerOrm(targetDir, config);
  await patchReadme(targetDir, config);
  await assertNoLeftoverMarkers(targetDir);

  report("✓ Feature files generated");
}
