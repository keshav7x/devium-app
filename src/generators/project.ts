import { note, outro } from "@clack/prompts";
import pc from "picocolors";
import process from "node:process";
import type { ProjectConfig } from "../types/project";
import { createProject, nextSteps, type BuildPhase } from "./create-project";
import { setReporter } from "../ui/reporter";
import {
  gradientText,
  hideCursor,
  isTTY,
  progressBar,
  showCursor,
  sparkle,
} from "../ui/terminal";

interface PhaseSpec {
  phase: BuildPhase;
  label: string;
  through: number; // cumulative fraction of the bar after this phase completes
}

function planFor(config: ProjectConfig): PhaseSpec[] {
  const base: PhaseSpec[] = [
    { phase: "validate", label: "Validating destination", through: 0 },
    { phase: "copy", label: "Copying templates", through: 0 },
    { phase: "features", label: "Generating feature modules", through: 0 },
    { phase: "merge", label: "Patching package.json", through: 0 },
  ];
  if (config.skipInstall) {
    base[0]!.through = 0.1;
    base[1]!.through = 0.55;
    base[2]!.through = 0.8;
    base[3]!.through = 1;
    return base;
  }
  base[0]!.through = 0.08;
  base[1]!.through = 0.42;
  base[2]!.through = 0.66;
  base[3]!.through = 0.8;
  base.push({
    phase: "install",
    label: `Installing dependencies with ${config.packageManager}`,
    through: 1,
  });
  return base;
}

const out = (s: string): void => {
  process.stdout.write(s);
};

export async function buildProject(config: ProjectConfig): Promise<void> {
  const plan = planFor(config);
  const interactive = isTTY();

  // swallow per-file generator chatter; the progress line is the UI
  if (interactive) setReporter({ info: () => undefined });

  const t0 = Date.now();
  let barAt = 0;
  let barDrawn = false;

  const renderBar = (pct: number, label: string): void => {
    if (!interactive) return;
    const p = Math.min(1, Math.max(0, pct));
    const line =
      `\r\x1b[2K  ${progressBar(p)} ` +
      `${pc.bold(String(Math.round(p * 100)).padStart(3))}%  ${pc.dim(label)}`;
    out(line);
    barDrawn = true;
  };
  const endBarLine = (): void => {
    if (interactive && barDrawn) out("\n");
    barDrawn = false;
  };

  hideCursor();
  try {
    await createProject(config, process.cwd(), {
      onPhase(phase, status) {
        const spec = plan.find((p) => p.phase === phase);
        if (!spec) return;
        if (status === "start") {
          if (phase === "install") {
            // hand the terminal over to the package manager's own output
            endBarLine();
            console.log(
              `\n  ${pc.dim(`Installing dependencies with ${config.packageManager} — this can take a minute…`)}\n`,
            );
            return;
          }
          renderBar(barAt, `${spec.label}…`);
          return;
        }
        barAt = spec.through;
        renderBar(barAt, spec.label);
      },
    });
  } finally {
    setReporter(null);
    endBarLine();
    showCursor();
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (interactive) {
    out(
      `\r\x1b[2K  ${progressBar(1)} ${pc.bold("100")}%  ${pc.green("✔")} ${pc.dim(`done in ${secs}s`)}\n\n`,
    );
  }

  // Celebrate
  await sparkle();
  console.log("  " + gradientText("✦  R E A D Y  ✦", 0.2));
  console.log();

  const steps = nextSteps(config).map((line) =>
    line.replace(/^(\S+)/, (m) => pc.yellow(m)),
  );
  note(steps.join("\n"), "Next steps");
  outro(`${pc.bold(pc.green("🚀 Happy building."))} ${pc.dim("Made with Devium")}`);
}
