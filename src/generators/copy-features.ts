import { report } from "../ui/reporter";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import type { FeatureKey, ProjectConfig } from "../types/project";
import { getTemplatesDir } from "../utils/paths";

const FEATURE_ORDER: FeatureKey[] = [
  "env",
  "logger",
  "cors",
  "errorClass",
  "zod",
  "docker",
];

export async function copyFeatures(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const templatesDir = getTemplatesDir();

  const selected = FEATURE_ORDER.filter((feature) => config.features[feature]);

  if (selected.length === 0) return;

  for (const feature of selected) {
    const featureDir = path.join(templatesDir, "features", feature);

    const commonSrc = path.join(featureDir, "src");
    if (existsSync(commonSrc)) {
      await fs.cp(commonSrc, path.join(targetDir, "src"), {
        recursive: true,
        force: true,
      });
    }

    const frameworkSrc = path.join(featureDir, config.framework, "src");
    if (existsSync(frameworkSrc)) {
      await fs.cp(frameworkSrc, path.join(targetDir, "src"), {
        recursive: true,
        force: true,
      });
    }

    const entries = await fs.readdir(featureDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      if (entry.name === "package.json") continue;
      await fs.copyFile(
        path.join(featureDir, entry.name),
        path.join(targetDir, entry.name),
      );
    }
  }

  report("✓ Feature files generated");
}
