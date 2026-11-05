import type { ProjectConfig } from "../types/project";

type FeatureFlags = ProjectConfig["features"];

const EXPRESS_TYPE_IMPORT =
  'import type { Express, NextFunction, Request, Response } from "express";';
const FASTIFY_TYPE_IMPORT =
  'import type { FastifyInstance, FastifyServerOptions } from "fastify";';
const APP_ERROR_EXPRESS_LINES = [
  "    if (err instanceof AppError) {",
  "      res.status(err.statusCode).json({ error: err.statusCode >= 500 ? \"Internal Server Error\" : err.message });",
  "      return;",
  "    }",
];
const APP_ERROR_FASTIFY_LINES = [
  "    if (err instanceof AppError) {",
  "      reply.status(err.statusCode).send({ error: err.statusCode >= 500 ? \"Internal Server Error\" : err.message });",
  "      return;",
  "    }",
];
const FALLBACK_STATUS_LINES = [
  "    const fallback = (err as { statusCode?: unknown }).statusCode;",
  "    const statusCode = typeof fallback === \"number\" && Number.isInteger(fallback) && fallback >= 400 && fallback <= 499 ? fallback : 500;",
];
const FASTIFY_ERROR_REPLY_LINES = [
  "    app.log.error({ err }, \"Unhandled error\");",
  "    reply.status(statusCode).send({",
  '      error: statusCode >= 500 ? "Internal Server Error" : err instanceof Error ? err.message : "Bad Request",',
  "    });",
];
const EXPRESS_ERROR_REPLY_LINES = [
  "    res.status(statusCode).json({",
  '      error: statusCode >= 500 ? "Internal Server Error" : err instanceof Error ? err.message : "Bad Request",',
  "    });",
];

function expressImports(features: FeatureFlags): string[] {
  const imports = [EXPRESS_TYPE_IMPORT];

  if (features.logger) {
    imports.push('import { logger } from "../utils/logger.js";');
    imports.push('import { requestLogger } from "./requestLogger.js";');
  }
  if (features.cors) imports.push('import { corsMiddleware } from "./cors.js";');
  if (features.zod) imports.push('import { demoRoutes } from "./demoRoutes.js";');
  if (features.errorClass) imports.push('import { AppError } from "../utils/errors.js";');

  return imports;
}

function expressRegistrations(features: FeatureFlags): string[] {
  const registrations: string[] = [];

  if (features.logger) registrations.push("  app.use(requestLogger);");
  if (features.cors) registrations.push("  app.use(corsMiddleware);");
  if (features.zod) {
    registrations.push(
      '  if (process.env.NODE_ENV !== "production") app.use(demoRoutes);',
    );
  }

  return registrations;
}

function expressErrorLines(features: FeatureFlags): string[] {
  const lines: string[] = [];

  if (features.errorClass) lines.push(...APP_ERROR_EXPRESS_LINES);
  lines.push(...FALLBACK_STATUS_LINES);
  lines.push(
    features.logger
      ? '    logger.error({ err }, "Unhandled error");'
      : "    console.error(err);",
  );
  lines.push(...EXPRESS_ERROR_REPLY_LINES);

  return lines;
}

function expressRegisterModules(registrations: string[]): string {
  if (registrations.length === 0) {
    return "export function registerModules(_app: Express): void {}";
  }

  return [
    "export function registerModules(app: Express): void {",
    ...registrations,
    "}",
  ].join("\n");
}

function expressRegistry(config: ProjectConfig): string {
  const { features } = config;

  return `${expressImports(features).join("\n")}

${expressRegisterModules(expressRegistrations(features))}

export function registerErrorHandler(app: Express): void {
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
${expressErrorLines(features).join("\n")}
  });
}
`;
}

function fastifyOptionsBody(features: FeatureFlags): string {
  if (!features.logger) return "{}";

  return "{\n  logger: {\n    ...loggerOptions,\n  },\n}";
}

function fastifyImports(features: FeatureFlags): string[] {
  const imports = [FASTIFY_TYPE_IMPORT];

  if (features.logger) imports.push('import { loggerOptions } from "../utils/logger.js";');
  if (features.cors) imports.push('import { registerCors } from "./cors.js";');
  if (features.zod) imports.push('import { registerDemoRoutes } from "./demoRoutes.js";');
  if (features.errorClass) imports.push('import { AppError } from "../utils/errors.js";');

  return imports;
}

function fastifyRegistrations(features: FeatureFlags): string[] {
  const registrations: string[] = [];

  if (features.cors) registrations.push("  await registerCors(app);");
  if (features.zod) {
    registrations.push(
      '  if (process.env.NODE_ENV !== "production") await registerDemoRoutes(app);',
    );
  }

  return registrations;
}

function fastifyErrorLines(features: FeatureFlags): string[] {
  const lines: string[] = [];

  if (features.errorClass) lines.push(...APP_ERROR_FASTIFY_LINES);
  lines.push(...FALLBACK_STATUS_LINES);
  lines.push(...FASTIFY_ERROR_REPLY_LINES);

  return lines;
}

function fastifyRegisterModules(registrations: string[]): string {
  if (registrations.length === 0) {
    return "export async function registerModules(_app: FastifyInstance): Promise<void> {}";
  }

  return [
    "export async function registerModules(app: FastifyInstance): Promise<void> {",
    ...registrations,
    "}",
  ].join("\n");
}

function fastifyRegistry(config: ProjectConfig): string {
  const { features } = config;

  return `${fastifyImports(features).join("\n")}

export const fastifyOptions: FastifyServerOptions = ${fastifyOptionsBody(features)};

${fastifyRegisterModules(fastifyRegistrations(features))}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, _request, reply) => {
${fastifyErrorLines(features).join("\n")}
  });
}
`;
}

export function buildRegistrySource(config: ProjectConfig): string {
  return config.framework === "express"
    ? expressRegistry(config)
    : fastifyRegistry(config);
}
