import fs from "node:fs/promises";
import path from "node:path";
import type { Feature, ManifestLayer, ProjectConfig } from "../types/project";
import { findTemplatesDir } from "../utils/paths";

export function selectedFeatures(config: ProjectConfig): Feature[] {
  const flags: Array<[Feature, boolean]> = [
    ["logger", config.features.logger],
    ["cors", config.features.cors],
    ["errorClass", config.features.errorClass],
    ["zod", config.features.zod],
    ["docker", config.features.docker],
  ];
  return flags.filter(([, on]) => on).map(([feature]) => feature);
}

function featureBase(feature: Feature): string {
  return path.join(findTemplatesDir(), "features", feature);
}

async function readJsonIfExists(p: string): Promise<ManifestLayer | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf-8")) as ManifestLayer;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Feature layers: shared manifest first, then framework-specific manifest.
 * Missing package.json files are skipped.
 */
export async function readFeatureManifests(
  feature: Feature,
  framework: string,
): Promise<ManifestLayer[]> {
  const base = featureBase(feature);
  const layers: ManifestLayer[] = [];

  const shared = await readJsonIfExists(path.join(base, "shared", "package.json"));
  if (shared) layers.push(shared);

  const fw = await readJsonIfExists(path.join(base, framework, "package.json"));
  if (fw) layers.push(fw);

  return layers;
}

/**
 * Copies feature file overlays into the target:
 *   <feature>/shared/files/**  then  <feature>/<framework>/files/**
 */
export async function copyFeatureFiles(
  feature: Feature,
  framework: string,
  targetDir: string,
): Promise<void> {
  const base = featureBase(feature);
  const overlays = [
    path.join(base, "shared", "files"),
    path.join(base, framework, "files"),
  ];

  for (const overlay of overlays) {
    try {
      await fs.cp(overlay, targetDir, { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }
}
