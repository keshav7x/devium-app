import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function currentDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

/**
 * Walks up from this module looking for a `templates/base/package.json`.
 * Works from source (cli/src/...) and from a bundled dist/ inside the
 * published package, without hard-coded relative depths.
 */
export function findTemplatesDir(): string {
  let dir = currentDir();

  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "templates");
    if (fs.existsSync(path.join(candidate, "base", "package.json"))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "Could not locate the templates directory. " +
      "Expected a folder containing templates/base/package.json above " +
      `${currentDir()}`,
  );
}
