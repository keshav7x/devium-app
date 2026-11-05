import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";

import { copyTemplate } from "./copy-template";
import { copyFeatureFiles } from "./features";
import { applyFeatures } from "./apply-features";
import { mergePackage } from "./merge-package";
import { validateDirectory } from "./validate-directory";
import { installDependencies } from "../utils/install";

export async function createProject(config: ProjectConfig): Promise<void> {
  const targetDir = path.resolve(process.cwd(), config.name);
  const targetExisted = await fs
    .stat(targetDir)
    .then(() => true, () => false);

  try {
    await validateDirectory(targetDir);

    console.log("\nCreating your Devium project...\n");

    await copyTemplate(config, targetDir);
    await copyFeatureFiles(config, targetDir);
    await applyFeatures(config, targetDir);
    await mergePackage(config, targetDir);

    if (config.skipInstall) {
      console.log("✓ Dependency installation skipped (--skip-install)");
    } else {
      await installDependencies(config.packageManager, targetDir);
      console.log("✓ Dependencies installed");
    }

    console.log(`\n✓ Project "${config.name}" created successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${config.name}`);
    if (config.skipInstall) {
      console.log(`  ${config.packageManager} install`);
    }
    console.log(`  cp .env.example .env   # then set DATABASE_URL`);
    if (config.features.docker) {
      console.log(`  # add a Postgres instance and set DATABASE_URL before running`);
    }
    console.log(`  ${config.packageManager} run dev`);
    console.log(`\nProject location: ${targetDir}`);
  } catch (error) {
    console.error("\n✗ Failed to create project:", error);

    // Only remove the target if we created it in this run — never
    // touch a directory that already existed.
    if (!targetExisted) {
      await fs.rm(targetDir, { recursive: true, force: true }).catch(() => {
        // best-effort cleanup; surface the original error below
      });
      console.error("  Partial output was cleaned up.");
    }

    throw error;
  }
}
