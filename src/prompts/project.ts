import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";
import pc from "picocolors";
import fs from "node:fs";
import path from "node:path";
import {
  buildFeatures,
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
  type Framework,
  type ORM,
  type PackageManager,
  type ProjectConfig,
  type Runtime,
} from "../types/project";
import { validateProjectName } from "../utils/validate-project-name";
import {
  bootSequence,
  detectPm,
  frame,
  isTTY,
  panel,
  shimmerIntro,
  showCursor,
  typewriter,
  waitForEnter,
  TOTAL_STEPS,
  type PanelSummary,
} from "../ui/terminal";

interface PromptOptions {
  skipInstall?: boolean;
}

function abort(): never {
  showCursor();
  cancel("Setup aborted. See you next time.");
  process.exit(0);
}

type UnwrapCancel<T> = T extends symbol ? never : T;

function ask<T>(value: T | symbol): UnwrapCancel<T> {
  if (isCancel(value)) abort();
  return value as UnwrapCancel<T>;
}

export async function getProjectConfig(
  options: PromptOptions = {},
): Promise<ProjectConfig> {
  if (!process.stdin.isTTY || !isTTY()) {
    throw new Error(
      "An interactive terminal is required to run the Devium CLI. " +
        "Connect a TTY and try again.",
    );
  }

  const cfg: PanelSummary = {};

  // 1. INTRO
  await shimmerIntro();
  console.log();
  await typewriter(
    `  ${pc.italic(pc.dim("Next-gen backend scaffolding, tailored to you"))}`,
  );
  console.log();
  await bootSequence();
  console.log();
  console.log(
    `  ${pc.yellow("»")} ${pc.dim("Press")} ${pc.bold(pc.white("Enter"))} ${pc.dim("to begin...")}`,
  );
  await waitForEnter();

  // 2. NAME
  frame(panel("Project Identity", cfg, 0, "name"));
  const nameInput = ask(
    await text({
      message: "What is the name of your application?",
      placeholder: "devium-app",
      defaultValue: "devium-app",
      validate(value) {
        const v = (value || "devium-app").trim();
        const result = validateProjectName(v);
        if (!result.valid) return result.error;
        if (fs.existsSync(path.resolve(process.cwd(), v))) {
          return `Folder "${v}" already exists.`;
        }
        return undefined;
      },
    }),
  );
  const name = nameInput.trim();
  cfg.name = name;

  // 3. RUNTIME
  frame(panel("Runtime", cfg, 1, "runtime"));
  const runtime = ask(
    await select<Runtime>({
      message: "Pick your runtime:",
      options: [
        { value: "node", label: "🟢 Node.js", hint: "LTS, runs everywhere" },
        { value: "bun", label: "🍞 Bun", hint: "Fast runtime & package manager" },
      ],
    }),
  );
  cfg.runtime = runtime;

  // 4. FRAMEWORK
  frame(panel("Core Engine", cfg, 2, "framework"));
  const framework = ask(
    await select<Framework>({
      message: "Select your core engine:",
      options: [
        { value: "express", label: "🚀 Express", hint: "Fast, minimalist, battle-tested" },
        { value: "fastify", label: "⚡ Fastify", hint: "Ultra-low overhead, schema-first" },
      ],
    }),
  );
  cfg.framework = framework;

  // 5. PACKAGE MANAGER
  frame(panel("Installer", cfg, 3, "pm"));
  const packageManager = ask(
    await select<PackageManager>({
      message: "Pick your package manager:",
      initialValue: detectPm() as PackageManager,
      options: [
        { value: "bun", label: "🌰 Bun", hint: "Fastest installs" },
        { value: "npm", label: "📦 npm", hint: "Comes with Node" },
        { value: "pnpm", label: "💾 pnpm", hint: "Disk-space efficient" },
        { value: "yarn", label: "🧶 Yarn", hint: "Classic & reliable" },
      ],
    }),
  );
  cfg.pm = packageManager;

  // 6. ORM
  frame(panel("Database Layer", cfg, 4, "orm"));
  const orm = ask(
    await select<ORM>({
      message: "Choose a database layer (PostgreSQL):",
      options: [
        { value: "drizzle", label: "💧 Drizzle", hint: "Lightweight & SQL-like" },
        { value: "prisma", label: "◭  Prisma", hint: "Rich ecosystem, great tooling" },
      ],
    }),
  );
  cfg.orm = orm;

  // 7. FEATURES
  frame(panel("Extra Modules", cfg, 5, "modules"));
  const selectableFeatures = FEATURE_KEYS.filter((key) => key !== "rateLimit");
  const selectedFeatures = ask(
    await multiselect<FeatureKey>({
      message: "Toggle additional modules (Space to select, Enter to confirm):",
      required: false,
      options: selectableFeatures.map((key) => ({
        value: key,
        label: FEATURE_LABELS[key],
      })),
    }),
  );
  const features = buildFeatures(selectedFeatures);

  if (features.auth) {
    const enableAuthRateLimit = ask(
      await confirm({
        message: "Add Redis-backed rate limiting to auth routes?",
        initialValue: false,
      }),
    );
    features.rateLimit = enableAuthRateLimit;
  }

  const enabledFeatureLabels = FEATURE_KEYS.filter((key) => features[key]);
  cfg.modules = enabledFeatureLabels;

  // 8. SUMMARY + CONFIRM
  frame(panel("Blueprint Ready", cfg, TOTAL_STEPS));
  const go = ask(
    await confirm({
      message: `Generate ${pc.cyan(name)} in ${pc.dim(path.resolve(process.cwd(), name))}?`,
    }),
  );
  if (!go) {
    cancel("Generation canceled.");
    process.exit(0);
  }

  return {
    name,
    framework,
    runtime,
    packageManager,
    orm,
    skipInstall: options.skipInstall === true,
    features,
  };
}
