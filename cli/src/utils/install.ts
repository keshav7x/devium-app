import { spawn } from "node:child_process";
import type { PackageManager } from "../types/project";

const installCommands: Record<PackageManager, string> = {
  npm: "npm",
  pnpm: "pnpm",
  yarn: "yarn",
  bun: "bun",
};

export function installDependencies(
  packageManager: PackageManager,
  cwd: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = installCommands[packageManager];

    const child = spawn(command, ["install"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            `Package manager "${command}" was not found on PATH. ` +
              `Install it or choose a different package manager.`,
          ),
        );
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${packageManager} install failed with exit code ${code}. ` +
            `Dependencies were NOT installed successfully.`,
        ),
      );
    });
  });
}
