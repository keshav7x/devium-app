import { report } from "../ui/reporter";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";

const ZOD_ANCHOR = "DATABASE_URL: z.string().min(1).optional()";
const ZOD_REQUIRED = "DATABASE_URL: z.string().min(1)";

export async function writeEnv(
  config: ProjectConfig,
  targetDir: string
): Promise<void> {
  if (!config.orm) return;

  const envPath = path.join(targetDir, "src/config/env.ts");
  let content = await fs.readFile(envPath, "utf-8");

  if (config.features.env) {
    const updated = content.replace(ZOD_ANCHOR, ZOD_REQUIRED);
    if (updated === content) {
      throw new Error(
        `Could not find the DATABASE_URL anchor in ${envPath}. Expected: ${ZOD_ANCHOR}`
      );
    }
    content = updated;
  } else {
    content += `
// Required when an ORM is selected.
if (!env.DATABASE_URL) {
  throw new Error(
    "The DATABASE_URL environment variable is required. Add it to your .env file (see .env.example)."
  );
}
`;
  }

  await fs.writeFile(envPath, content);
  report("✓ Environment validation configured for ORM");
}
