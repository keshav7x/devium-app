import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

let cachedTemplatesDir: string | null = null;

export function getTemplatesDir(): string {
  if (cachedTemplatesDir) return cachedTemplatesDir;

  let dir = moduleDir;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(dir, "templates");
    if (existsSync(path.join(candidate, "base", "package.json"))) {
      cachedTemplatesDir = candidate;
      return cachedTemplatesDir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Unable to locate the templates directory (searched upward from ${moduleDir}). ` +
      "Reinstall the devium package or run it from a complete checkout.",
  );
}
