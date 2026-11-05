import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";
import { validateProjectName } from "../utils/validate-project-name";
import { applyFeatures } from "./apply-features";
import { copyTemplate } from "./copy-template";
import { mergePackage } from "./merge-package";
import { validateDirectory } from "./validate-directory";
import { installDependencies } from "../utils/install";
import { report } from "../ui/reporter";

export type BuildPhase = "validate" | "copy" | "features" | "merge" | "install";

export interface BuildHooks {
  onPhase?(phase: BuildPhase, status: "start" | "done"): void;
}

export function nextSteps(config: ProjectConfig): string[] {
  const steps = [`cd ${config.name}`];
  if (config.skipInstall) {
    steps.push(`${config.packageManager} install`);
  }
  if (config.orm) {
    steps.push("cp .env.example .env   # then set DATABASE_URL");
  }
  steps.push(`${config.packageManager} run dev`);
  return steps;
}

export async function createProject(
  config: ProjectConfig,
  cwd: string = process.cwd(),
  hooks: BuildHooks = {},
): Promise<void> {
  const phase = hooks.onPhase ?? (() => undefined);

  phase("validate", "start");
  const nameCheck = validateProjectName(config.name);
  if (!nameCheck.valid) {
    throw new Error(`Invalid project name: ${nameCheck.error}`);
  }

  const targetDir = path.resolve(cwd, config.name);
  await validateDirectory(targetDir);
  const createdDirectory = !existsSync(targetDir);
  phase("validate", "done");

  try {
    phase("copy", "start");
    await copyTemplate(config, targetDir);
    phase("copy", "done");

    phase("features", "start");
    await applyFeatures(config, targetDir);
    phase("features", "done");

    phase("merge", "start");
    await mergePackage(config, targetDir);
    phase("merge", "done");

    if (!config.skipInstall) {
      phase("install", "start");
      await installDependencies(config.packageManager, targetDir);
      phase("install", "done");
    }

    report(`✓ Project "${config.name}" created successfully!`);
  } catch (error) {
    if (createdDirectory && existsSync(targetDir)) {
      await fs.rm(targetDir, { recursive: true, force: true });
      console.error(`Cleaned up incomplete project directory: ${targetDir}`);
    }
    throw error;
  }
}
