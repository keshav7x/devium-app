import { report } from "../ui/reporter";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";

function buildDockerfile(config: ProjectConfig): string {
  const isBun = config.runtime === "bun";
  const isPrisma = config.orm === "prisma";

  const prismaCopyDeps = isPrisma
    ? "COPY prisma ./prisma\nCOPY prisma.config.ts ./prisma.config.ts\n"
    : "";
  const prismaGeneratedBuild = isPrisma
    ? "COPY --from=deps /app/src/generated ./src/generated\n"
    : "";

  if (isBun) {
    return `# Devium Dockerfile (Bun runtime)
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
${prismaCopyDeps}RUN bun install

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
${prismaGeneratedBuild}RUN bun run build

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
${prismaCopyDeps}RUN bun install --production --ignore-scripts
COPY --from=build /app/dist ./dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- "http://127.0.0.1:\${PORT:-3000}/health" || exit 1

CMD ["bun", "dist/server.js"]
`;
  }

  const installStep =
    config.packageManager === "npm"
      ? "RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi"
      : config.packageManager === "pnpm"
        ? "RUN corepack enable && pnpm install"
        : "RUN corepack enable && yarn install";

  const pruneStep =
    config.packageManager === "npm"
      ? "\nRUN npm prune --omit=dev"
      : config.packageManager === "pnpm"
        ? "\nRUN pnpm prune --prod"
        : "";

  return `# Devium Dockerfile (Node.js runtime)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
${prismaCopyDeps}${installStep}

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
${prismaGeneratedBuild}RUN npm run build${pruneStep}

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- "http://127.0.0.1:\${PORT:-3000}/health" || exit 1

CMD ["node", "dist/server.js"]
`;
}

export async function writeDocker(
  config: ProjectConfig,
  targetDir: string
): Promise<void> {
  await fs.writeFile(path.join(targetDir, "Dockerfile"), buildDockerfile(config));
  report("✓ Dockerfile written");
}
