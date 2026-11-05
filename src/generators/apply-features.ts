import { report } from "../ui/reporter";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";
import { buildRegistrySource } from "./registry";
import { applyLineMarkers, hasUnresolvedMarkers } from "./markers";
import { writeDockerfile } from "./docker";
import { getTemplatesDir } from "../utils/paths";

const FRAMEWORK_DIRS = new Set(["express", "fastify"]);
const FEATURE_ORDER = ["logger", "cors", "env", "errorClass", "zod", "docker"] as const;

async function overlayFeature(
  feature: string,
  framework: string,
  targetDir: string,
): Promise<void> {
  const root = path.join(getTemplatesDir(), "features", feature);
  if (!existsSync(root)) return;

  const filter = (source: string): boolean =>
    path.basename(source) !== "package.json";

  const sharedEntries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of sharedEntries) {
    if (entry.name === "package.json") continue;
    if (entry.isDirectory() && FRAMEWORK_DIRS.has(entry.name)) continue;
    await fs.cp(path.join(root, entry.name), path.join(targetDir, entry.name), {
      recursive: true,
      force: true,
      filter,
    });
  }

  const frameworkRoot = path.join(root, framework);
  if (existsSync(frameworkRoot)) {
    const frameworkEntries = await fs.readdir(frameworkRoot, {
      withFileTypes: true,
    });
    for (const entry of frameworkEntries) {
      if (entry.name === "package.json") continue;
      await fs.cp(
        path.join(frameworkRoot, entry.name),
        path.join(targetDir, entry.name),
        { recursive: true, force: true, filter },
      );
    }
  }
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
      await overlayFeature(feature, config.framework, targetDir);
    }
  }

  if (config.features.docker) {
    await writeDockerfile(config, targetDir);
  }

  const registryPath = path.join(targetDir, "src", "modules", "index.ts");
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, buildRegistrySource(config));

  await patchEnvDatabaseUrl(targetDir, config);
  await patchServerOrm(targetDir, config);
  await patchReadme(targetDir, config);
  await assertNoLeftoverMarkers(targetDir);

  report("✓ Feature files generated");
}
