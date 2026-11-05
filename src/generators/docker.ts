import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { PackageManager, ProjectConfig } from "../types/project";
import { applyInlineMarkers } from "./markers";
import { getTemplatesDir } from "../utils/paths";

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm ci",
  pnpm: "corepack enable && pnpm install --frozen-lockfile",
  yarn: "corepack enable && yarn install --frozen-lockfile",
  bun: "bun install --frozen-lockfile",
};

const PROD_INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm ci --omit=dev --ignore-scripts",
  pnpm: "corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts",
  yarn: "corepack enable && yarn install --production=true --frozen-lockfile --ignore-scripts",
  bun: "bun install --production --frozen-lockfile --ignore-scripts",
};

const GENERATED_DOCKERFILES = ["Dockerfile.node", "Dockerfile.bun"] as const;

export async function writeDockerfile(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const templatePath = path.join(
    getTemplatesDir(),
    "features",
    "docker",
    `Dockerfile.${config.runtime}`,
  );

  if (!existsSync(templatePath)) {
    throw new Error(
      `Missing Dockerfile template for runtime "${config.runtime}".`,
    );
  }

  const template = await fs.readFile(templatePath, "utf8");
  const dockerContent = applyInlineMarkers(template, {
    installCmd: INSTALL_COMMANDS[config.packageManager],
    prodInstallCmd: PROD_INSTALL_COMMANDS[config.packageManager],
    buildCmd: `${config.packageManager} run build`,
  });

  await fs.writeFile(path.join(targetDir, "Dockerfile"), dockerContent);

  for (const fileName of GENERATED_DOCKERFILES) {
    const leftoverPath = path.join(targetDir, fileName);
    if (existsSync(leftoverPath)) await fs.rm(leftoverPath);
  }
}
