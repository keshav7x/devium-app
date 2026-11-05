import {
  intro,
  outro,
  text,
  select,
  confirm,
  multiselect,
  isCancel,
  cancel,
  note,
} from "@clack/prompts";

import type {
  ProjectConfig,
  Framework,
  Runtime,
  PackageManager,
  ORM,
  Feature,
} from "../types/project";
import { validateProjectName } from "../utils/validate-project-name";

interface PromptOptions {
  skipInstall: boolean;
}

function abort(): never {
  cancel("Operation cancelled.");
  process.exit(0);
}

export async function getProjectConfig(
  options: PromptOptions = { skipInstall: false },
): Promise<ProjectConfig> {
  intro(" Devium CLI ");

  const projectName = await text({
    message: "What is your project name?",
    placeholder: "devium-api",
    validate: (value) => validateProjectName(value ?? ""),
  });
  if (isCancel(projectName)) abort();

  const framework = await select<Framework>({
    message: "Choose a framework:",
    options: [
      { value: "express", label: "Express" },
      { value: "fastify", label: "Fastify" },
    ],
  });
  if (isCancel(framework)) abort();

  const runtime = await select<Runtime>({
    message: "Choose a runtime:",
    options: [
      { value: "node", label: "Node.js" },
      { value: "bun", label: "Bun" },
    ],
  });
  if (isCancel(runtime)) abort();

  const packageManager = await select<PackageManager>({
    message: "Choose a package manager:",
    options: [
      { value: "npm", label: "npm" },
      { value: "pnpm", label: "pnpm" },
      { value: "yarn", label: "yarn" },
      { value: "bun", label: "Bun" },
    ],
  });
  if (isCancel(packageManager)) abort();

  const orm = await select<ORM>({
    message: "Choose an ORM (PostgreSQL):",
    options: [
      { value: "drizzle", label: "Drizzle" },
      { value: "prisma", label: "Prisma" },
    ],
  });
  if (isCancel(orm)) abort();

  const options = await multiselect<Feature>({
    message: "Select optional features:",
    options: [
      { value: "logger", label: "Logger (Pino)" },
      { value: "cors", label: "CORS" },
      { value: "errorClass", label: "Custom error classes" },
      { value: "zod", label: "Request validation (Zod)" },
      { value: "docker", label: "Docker configuration" },
    ],
    required: false,
  });
  if (isCancel(options)) abort();

  const config: ProjectConfig = {
    name: projectName.trim(),
    framework,
    runtime,
    packageManager,
    orm,
    skipInstall: options.skipInstall ?? false,
    features: {
      logger: options.includes("logger"),
      cors: options.includes("cors"),
      errorClass: options.includes("errorClass"),
      zod: options.includes("zod"),
      docker: options.includes("docker"),
    },
  };

  const featureList = Object.entries(config.features)
    .filter(([, on]) => on)
    .map(([name]) => name);

  note(
    [
      `Name:           ${config.name}`,
      `Framework:      ${config.framework}`,
      `Runtime:        ${config.runtime}`,
      `Package manager: ${config.packageManager}`,
      `ORM:            ${config.orm} (PostgreSQL)`,
      `Features:       ${featureList.length > 0 ? featureList.join(", ") : "(none)"}`,
      `Install deps:   ${config.skipInstall ? "no (--skip-install)" : "yes"}`,
    ].join("\n"),
    "Configuration summary",
  );

  const shouldContinue = await confirm({
    message: "Create the project with this configuration?",
    initialValue: true,
  });
  if (isCancel(shouldContinue) || !shouldContinue) abort();

  outro("Starting generation...");

  return config;
}
