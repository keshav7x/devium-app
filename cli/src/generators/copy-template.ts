import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";
import { findTemplatesDir } from "../utils/paths";

const templatesDir = findTemplatesDir();

const IGNORED_ENTRIES = new Set(["node_modules", "bun.lock", ".git"]);

function filterTemplateEntry(src: string): boolean {
  const base = path.basename(src);
  return !IGNORED_ENTRIES.has(base);
}

/**
 * Copies base → framework → ORM overlays into targetDir.
 * package.json is never copied from framework/orm manifests here —
 * merge-package.ts owns manifest composition.
 */
export const copyTemplate = async (
  config: ProjectConfig,
  targetDir: string,
): Promise<void> => {
  const basePath = path.join(templatesDir, "base");
  const frameworkPath = path.join(templatesDir, config.framework);
  const ormPath = path.join(templatesDir, "orm", config.orm);

  await fs.mkdir(targetDir, { recursive: true });

  await fs.cp(basePath, targetDir, {
    recursive: true,
    force: true,
    filter: filterTemplateEntry,
  });

  await fs.cp(path.join(frameworkPath, "src"), path.join(targetDir, "src"), {
    recursive: true,
    force: true,
    filter: filterTemplateEntry,
  });

  await fs.cp(path.join(ormPath, "src"), path.join(targetDir, "src"), {
    recursive: true,
    force: true,
    filter: filterTemplateEntry,
  });

  if (config.orm === "drizzle") {
    await fs.cp(
      path.join(ormPath, "drizzle.config.ts"),
      path.join(targetDir, "drizzle.config.ts"),
      { force: true },
    );
  }

  if (config.orm === "prisma") {
    await fs.cp(path.join(ormPath, "prisma"), path.join(targetDir, "prisma"), {
      recursive: true,
      force: true,
    });
  }

  console.log("✓ Templates copied");
};
