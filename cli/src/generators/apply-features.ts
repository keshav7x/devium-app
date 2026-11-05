import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";
import { renderMarkers } from "./render-markers";
import { buildSnippets } from "./snippets";

interface DockerMarkers {
  [key: string]: string;
}

function buildDockerMarkers(config: ProjectConfig): DockerMarkers {
  const useBunImage = config.packageManager === "bun";
  const pm = config.packageManager;

  const installCmd: Record<string, string> = {
    npm: "npm install",
    pnpm: "pnpm install",
    yarn: "yarn install",
    bun: "bun install",
  };

  const pruneCmd: Record<string, string> = {
    npm: "RUN npm prune --omit=dev",
    pnpm: "RUN pnpm prune --prod",
    yarn: "RUN yarn install --production",
    bun: "",
  };

  return {
    BASE_IMAGE: useBunImage ? "oven/bun:1-alpine" : "node:22-alpine",
    DOCKER_USER: useBunImage ? "bun" : "node",
    APK_DEPS:
      config.orm === "prisma" ? "RUN apk add --no-cache openssl" : "",
    PM_SETUP:
      pm === "pnpm" || pm === "yarn" ? "RUN corepack enable" : "",
    INSTALL_CMD: installCmd[pm]!,
    BUILD_CMD: `${pm} run build`,
    PRUNE_CMD: pruneCmd[pm]!,
    POST_INSTALL:
      config.orm === "prisma" ? `${pm} run db:generate` : "",
    START_JSON: useBunImage
      ? '"bun", "dist/server.js"'
      : '"node", "dist/server.js"',
  };
}

/**
 * Renders marker slots in files that already exist in the target.
 * Missing files are skipped silently (e.g. Dockerfile when the feature
 * is not selected).
 */
export async function applyFeatures(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const slots = buildSnippets(config);
  const markers: Record<string, string | undefined> = {
    imports: slots.imports.join("\n"),
    middleware: slots.middleware.join("\n"),
    plugins: slots.plugins.join("\n"),
    loggerConfig: slots.loggerConfig,
    routes: slots.routes.join("\n"),
    notFound: slots.notFound,
    errorHandler: slots.errorHandler,
    extraEnv: slots.extraEnv.join("\n"),
    extraEnvExample: slots.extraEnvExample.join("\n"),
    PROJECT_NAME: config.name,
    ormDocs: slots.ormDocs,
    dockerDocs: slots.dockerDocs,
    ...buildDockerMarkers(config),
  };

  const filesToRender = [
    "src/app.ts",
    "src/config/env.ts",
    ".env.example",
    "README.md",
    "Dockerfile",
  ];

  for (const relative of filesToRender) {
    const filePath = path.join(targetDir, relative);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      await fs.writeFile(filePath, renderMarkers(content, markers));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }

  console.log("✓ Feature configuration applied");
}
