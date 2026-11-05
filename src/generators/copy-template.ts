import { report } from "../ui/reporter";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";
import { getTemplatesDir } from "../utils/paths";

const IGNORED_ENTRIES = new Set(["node_modules", "bun.lock", ".git", ".env"]);

function copyFilter(source: string): boolean {
  return !IGNORED_ENTRIES.has(path.basename(source));
}

export async function copyTemplate(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const templatesDir = getTemplatesDir();

  await fs.mkdir(targetDir, { recursive: true });

  await fs.cp(path.join(templatesDir, "base"), targetDir, {
    recursive: true,
    force: true,
    filter: copyFilter,
  });

  await fs.cp(
    path.join(templatesDir, config.framework, "src"),
    path.join(targetDir, "src"),
    { recursive: true, force: true, filter: copyFilter },
  );

  const ormPath = path.join(templatesDir, "orm", config.orm);
  await fs.cp(path.join(ormPath, "src"), path.join(targetDir, "src"), {
    recursive: true,
    force: true,
    filter: copyFilter,
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
      filter: copyFilter,
    });
    await fs.cp(
      path.join(ormPath, "prisma.config.ts"),
      path.join(targetDir, "prisma.config.ts"),
      { force: true },
    );
  }

  report("✓ Templates copied");
}
