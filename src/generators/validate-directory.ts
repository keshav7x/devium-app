import fs from "node:fs/promises";

export async function validateDirectory(targetDir: string): Promise<void> {
  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      throw new Error(
        `Destination already exists and is not a directory: ${targetDir}`,
      );
    }
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(
        `Destination directory is not empty: ${targetDir}. ` +
          "Choose a different project name or remove the directory first.",
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}
