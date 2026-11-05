import fs from "node:fs/promises";

export async function validateDirectory(targetDir: string): Promise<void> {
  let stats: Awaited<ReturnType<typeof fs.stat>>;

  try {
    stats = await fs.stat(targetDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (!stats.isDirectory()) {
    throw new Error(
      `Destination already exists and is not a directory: ${targetDir}`,
    );
  }

  const entries = await fs.readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(
      `Directory is not empty: ${targetDir}\n` +
        `Choose a different project name or remove the existing directory.`,
    );
  }
}
