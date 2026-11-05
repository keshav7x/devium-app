import { report } from "../ui/reporter";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import type { ProjectConfig } from "../types/project";
import { getTemplatesDir } from "../utils/paths";

export interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const FORBIDDEN_MANIFEST_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function mergeObject<T>(target: Record<string, T>, source: Record<string, T> | undefined): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (FORBIDDEN_MANIFEST_KEYS.has(key)) continue;
    target[key] = value;
  }
}

function setOther(target: Record<string, unknown>, key: string, value: unknown): void {
  if (FORBIDDEN_MANIFEST_KEYS.has(key)) return;
  target[key] = value;
}

export function mergeManifests(manifests: readonly PackageManifest[]): PackageManifest {
  const scripts: Record<string, string> = {};
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const others: Record<string, unknown> = {};

  for (const manifest of manifests) {
    if (!manifest || typeof manifest !== "object") continue;
    mergeObject(scripts, manifest.scripts);
    mergeObject(dependencies, manifest.dependencies);
    mergeObject(devDependencies, manifest.devDependencies);
    for (const [key, value] of Object.entries(manifest)) {
      if (
        key === "scripts" ||
        key === "dependencies" ||
        key === "devDependencies"
      ) {
        continue;
      }
      setOther(others, key, value);
    }
  }

  for (const dependency of Object.keys(dependencies)) {
    delete devDependencies[dependency];
  }

  const merged: PackageManifest = { ...others };
  if (Object.keys(scripts).length > 0) merged.scripts = scripts;
  if (Object.keys(dependencies).length > 0) merged.dependencies = dependencies;
  if (Object.keys(devDependencies).length > 0) {
    merged.devDependencies = devDependencies;
  }
  return merged;
}

export function getRuntimeScripts(config: ProjectConfig): Record<string, string> {
  return {
    dev:
      config.runtime === "bun"
        ? "bun --watch src/server.ts"
        : "tsx watch src/server.ts",
    build: "tsc",
    start:
      config.runtime === "bun"
        ? "bun dist/server.js"
        : "node dist/server.js",
  };
}

function featureManifestPaths(
  feature: string,
  framework: string | undefined,
): string[] {
  const templatesDir = getTemplatesDir();
  const paths: string[] = [];

  const sharedPath = path.join(
    templatesDir,
    "features",
    feature,
    "package.json",
  );
  if (existsSync(sharedPath)) paths.push(sharedPath);

  if (framework) {
    const frameworkPath = path.join(
      templatesDir,
      "features",
      feature,
      framework,
      "package.json",
    );
    if (existsSync(frameworkPath)) paths.push(frameworkPath);
  }

  return paths;
}

export async function readFeatureManifests(
  config: ProjectConfig,
): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = [];
  const entries: Array<[feature: string, framework?: string]> = [
    ["logger", config.framework],
    ["cors", config.framework],
    ["env"],
    ["zod", config.framework],
    ["errorClass"],
    ["docker"],
  ];

  for (const [feature, framework] of entries) {
    if (!config.features[feature as keyof typeof config.features]) continue;
    for (const manifestPath of featureManifestPaths(feature, framework)) {
      const raw = await fs.readFile(manifestPath, "utf8");
      manifests.push(JSON.parse(raw) as PackageManifest);
    }
  }

  return manifests;
}

export async function mergePackage(
  config: ProjectConfig,
  targetDir: string,
): Promise<void> {
  const templatesDir = getTemplatesDir();
  const targetManifestPath = path.join(targetDir, "package.json");

  const base = JSON.parse(
    await fs.readFile(targetManifestPath, "utf8"),
  ) as PackageManifest;
  const framework = JSON.parse(
    await fs.readFile(
      path.join(templatesDir, config.framework, "package.json"),
      "utf8",
    ),
  ) as PackageManifest;
  const orm = JSON.parse(
    await fs.readFile(
      path.join(templatesDir, "orm", config.orm, "package.json"),
      "utf8",
    ),
  ) as PackageManifest;
  const featureManifests = await readFeatureManifests(config);

  const merged = mergeManifests([
    base,
    framework,
    orm,
    ...featureManifests,
    { scripts: getRuntimeScripts(config) },
  ]);

  merged.name = config.name;

  await fs.writeFile(
    targetManifestPath,
    `${JSON.stringify(merged, null, 2)}\n`,
  );

  report("✓ Package configuration merged");
}
