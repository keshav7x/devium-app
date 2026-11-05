import type { ProjectConfig } from "../types/project";

export interface SnippetSlots {
  imports: string[];
  middleware: string[];
  plugins: string[];
  loggerConfig: string;
  routes: string[];
  notFound: string;
  errorHandler: string;
  extraEnv: string[];
  extraEnvExample: string[];
  ormDocs: string;
  dockerDocs: string;
}

function expressErrorImport(config: ProjectConfig): string[] {
  const lines = [
    'import type { NextFunction, Request, Response } from "express";',
  ];
  if (config.features.errorClass) {
    lines.push('import { AppError } from "./shared/errors.js";');
  }
  return lines;
}

function expressErrorHandler(config: ProjectConfig): string {
  const logLine = config.features.logger
    ? "logger.error(err);"
    : "console.error(err);";

  if (config.features.errorClass) {
    return [
      "app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {",
      "  if (err instanceof AppError) {",
      '    res.status(err.statusCode).json({ success: false, message: err.message });',
      "    return;",
      "  }",
      `  ${logLine}`,
      '  res.status(500).json({ success: false, message: "Internal server error" });',
      "});",
    ].join("\n");
  }

  return [
    "app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {",
    `  ${logLine}`,
    '  res.status(500).json({ success: false, message: "Internal server error" });',
    "});",
  ].join("\n");
}

function expressNotFound(config: ProjectConfig): string {
  return [
    "app.use((_req, res) => {",
    '  res.status(404).json({ success: false, message: "Not found" });',
    "});",
  ].join("\n");
}

function fastifyErrorHandler(config: ProjectConfig): string {
  const logLine = config.features.logger
    ? "logger.error(err);"
    : "console.error(err);";

  if (config.features.errorClass) {
    return [
      "app.setErrorHandler((err, _request, reply) => {",
      "  if (err instanceof AppError) {",
      '    reply.status(err.statusCode).send({ success: false, message: err.message });',
      "    return;",
      "  }",
      `  ${logLine}`,
      '  reply.status(500).send({ success: false, message: "Internal server error" });',
      "});",
    ].join("\n");
  }

  return [
    "app.setErrorHandler((err, _request, reply) => {",
    `  ${logLine}`,
    '  reply.status(500).send({ success: false, message: "Internal server error" });',
    "});",
  ].join("\n");
}

function fastifyNotFound(config: ProjectConfig): string {
  return [
    "app.setNotFoundHandler((_request, reply) => {",
    '  reply.status(404).send({ success: false, message: "Not found" });',
    "});",
  ].join("\n");
}

function ormDocs(config: ProjectConfig): string {
  const pm = config.packageManager;
  const run = (script: string) => `${pm} run ${script}`;

  if (config.orm === "drizzle") {
    return [
      "## Database (Drizzle + PostgreSQL)",
      "",
      "Edit `src/db/schema.ts`, then:",
      "",
      "```bash",
      `${run("db:generate")}   # generate migrations from the schema`,
      `${run("db:migrate")}    # apply pending migrations`,
      `${run("db:push")}       # push the schema directly (quick dev`,
      `${run("db:studio")}     # open Drizzle Studio`,
      "```",
      "",
      "Set `DATABASE_URL` in `.env` first:",
      "",
      "```",
      "DATABASE_URL=postgresql://user:password@localhost:5432/devium_db",
      "```",
    ].join("\n");
  }

  return [
    "## Database (Prisma + PostgreSQL)",
    "",
    "Edit `prisma/schema.prisma`, then:",
    "",
    "```bash",
    `${run("db:migrate")}    # create and apply a migration`,
    `${run("db:generate")}   # regenerate the Prisma client`,
    `${run("db:studio")}     # open Prisma Studio`,
    "```",
    "",
    "Set `DATABASE_URL` in `.env` first:",
    "",
    "```",
    "DATABASE_URL=postgresql://user:password@localhost:5432/devium_db",
    "```",
  ].join("\n");
}

function dockerDocs(config: ProjectConfig): string {
  return [
    "## Docker",
    "",
    "A production multi-stage `Dockerfile` and `.dockerignore` are included.",
    "",
    "```bash",
    "docker build -t " + config.name + " .",
    `docker run --env-file .env -p 3000:3000 ${config.name}`,
    "```",
  ].join("\n");
}

export function buildSnippets(config: ProjectConfig): SnippetSlots {
  const slots: SnippetSlots = {
    imports: [],
    middleware: [],
    plugins: [],
    loggerConfig: "logger: true,",
    routes: [],
    notFound: "",
    errorHandler: "",
    extraEnv: [],
    extraEnvExample: [],
    ormDocs: ormDocs(config),
    dockerDocs: config.features.docker ? dockerDocs(config) : "",
  };

  if (config.framework === "express") {
    slots.imports.push(...expressErrorImport(config));

    if (config.features.logger) {
      slots.imports.unshift(
        'import { pinoHttp } from "pino-http";',
        'import { logger } from "./utils/logger.js";',
      );
      slots.middleware.push("app.use(pinoHttp({ logger }));");
    }    if (config.features.cors) {
      slots.imports.unshift(
        'import cors from "cors";',
        'import { env } from "./config/env.js";',
      );
      slots.middleware.push(
        "app.use(",
        "  cors({",
        '    origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(","),',
        "  }),",
        ");",
      );
    }
    if (config.features.zod) {
      slots.imports.push(
        'import { usersRouter } from "./modules/users/index.js";',
      );
      slots.routes.push('app.use("/users", usersRouter);');
    }

    slots.notFound = expressNotFound(config);
    slots.errorHandler = expressErrorHandler(config);
  } else {
    if (config.features.logger) {
      slots.imports.push('import { loggerOptions } from "./utils/logger.js";');
      slots.loggerConfig = "logger: loggerOptions,";
    }
    if (config.features.cors) {
      slots.imports.unshift(
        'import cors from "@fastify/cors";',
        'import { env } from "./config/env.js";',
      );
      slots.plugins.push(
        "app.register(cors, {",
        '  origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(","),',
        "});",
      );
    }
    if (config.features.errorClass) {
      slots.imports.push('import { AppError } from "./shared/errors.js";');
    }
    if (config.features.logger) {
      slots.imports.push('import { logger } from "./utils/logger.js";');
    }
    if (config.features.zod) {
      slots.imports.push(
        'import { usersRoutes } from "./modules/users/index.js";',
      );
      slots.routes.push(
        'app.register(usersRoutes, { prefix: "/users" });',
      );
    }

    slots.notFound = fastifyNotFound(config);
    slots.errorHandler = fastifyErrorHandler(config);
  }

  if (config.features.logger) {
    slots.extraEnv.push('LOG_LEVEL: z.string().default("info"),');
    slots.extraEnvExample.push("LOG_LEVEL=info");
  }
  if (config.features.cors) {
    slots.extraEnv.push('CORS_ORIGINS: z.string().default("*"),');
    slots.extraEnvExample.push("# Comma-separated origins, or *");
    slots.extraEnvExample.push("CORS_ORIGINS=*");
  }

  return slots;
}
