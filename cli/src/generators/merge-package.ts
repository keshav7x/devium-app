import fs from "node:fs/promises";
import path from "node:path";
import type { ManifestLayer, ProjectConfig } from "../types/project";
import { findTemplatesDir } from "../utils/paths";
import { buildFeatureLayer } from "./features";

const templatesDir = findTemplatesDir();

async function readManifest(filePath: string): Promise<ManifestLayer> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as ManifestLayer;
}

function mergeLayers(layers: ManifestLayer[]): ManifestLayer {
  const merged: ManifestLayer = {
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };

  for (const layer of layers) {
    Object.assign(merged.dependencies!, layer.dependencies);
    Object.assign(merged.devDependencies!, layer.devDependencies);
    Object.assign(merged.scripts!, layer.scripts);
  }

  return merged;
}

function runtimeScripts(config: ProjectConfig): Record<string, string> {
  const isBun = config.runtime === "bun";
  return {
    dev: isBun ? "bun --watch src/server.ts" : "tsx watch src/server.ts",
    build: "tsc",
    start: isBun ? "bun dist/server.js" : "node dist/server.js",
  };
}

/** Pure composition of every manifest layer — exported for tests. */
export function composeManifest(
  config: ProjectConfig,
  layers: ManifestLayer[],
): ManifestLayer {
  const merged = mergeLayers(layers);

  // Deliberate script conflict resolution: runtime scripts always win
  // over base/orm scripts for dev/build/start; db:* scripts are preserved.
  merged.scripts = {
    ...merged.scripts,
    ...runtimeScripts(config),
  };

  // Prisma CLI and client must stay on identical versions.
  const prisma = merged.dependencies?.["@prisma/client"];
  const prismaCli = merged.devDependencies?.["prisma"];
  if (prisma && prismaCli && prisma !== prismaCli) {
    throw new Error(
      `Prisma version mismatch: @prisma/client=${prisma} vs prisma=${prismaCli}`,
    );
  }

  return merged;
}

export async function mergePackage(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const base = await readManifest(path.join(targetDir, "package.json"));
  const framework = await readManifest(
    path.join(templatesDir, config.framework, "package.json"),
  );
  const orm = await readManifest(
    path.join(templatesDir, "orm", config.orm, "package.json"),
  );
  const featureLayer = buildFeatureLayer(config);

  const merged = composeManifest(config, [
    base,
    framework,
    orm,
    featureLayer,
  ]);

  const output = {
    name: config.name,
    version: "1.0.0",
    private: true,
    type: "module",
    ...merged,
  };

  await fs.writeFile(
    path.join(targetDir, "package.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log("✓ Package configuration merged");
}
