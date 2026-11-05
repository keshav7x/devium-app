import { report } from "../ui/reporter";
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
  const command = installCommands[packageManager];

  report(`\nInstalling dependencies with ${packageManager}...\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, ["install"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            `Package manager "${packageManager}" was not found on this system. ` +
              "Install it, or re-run the CLI with --skip-install.",
          ),
        );
      } else {
        reject(error);
      }
    });

    child.on("close", (code, signal) => {
      if (signal) {
        reject(
          new Error(`${packageManager} install terminated by signal ${signal}`),
        );
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${packageManager} install failed with exit code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}
