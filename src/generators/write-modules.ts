import { report } from "../ui/reporter";
import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectConfig } from "../types/project";

const GET_STATUS_CODE = `
function getStatusCode(err: unknown): number {
  if (typeof err === "object" && err !== null && "statusCode" in err) {
    const statusCode = (err as { statusCode: unknown }).statusCode;
    if (
      typeof statusCode === "number" &&
      statusCode >= 400 &&
      statusCode < 600
    ) {
      return statusCode;
    }
  }
  return 500;
}
`;

function expressRegistry(config: ProjectConfig): string {
  const { logger, cors, errorClass, zod } = config.features;

  const imports = [
    'import type { Express, NextFunction, Request, Response } from "express";',
  ];
  if (logger) {
    imports.push(
      'import { requestLogger } from "./requestLogger.js";',
      'import { logger } from "../utils/logger.js";'
    );
  }
  if (cors) imports.push('import { corsMiddleware } from "./cors.js";');
  if (zod) imports.push('import { demoRoutes } from "./demoRoutes.js";');
  if (errorClass) imports.push('import { AppError } from "../utils/errors.js";');

  const registerUses: string[] = [];
  if (logger) registerUses.push("  app.use(requestLogger);");
  if (cors) registerUses.push("  app.use(corsMiddleware);");
  if (zod) registerUses.push("  app.use(demoRoutes);");

  const logStatement = logger
    ? '    logger.error({ err }, "Unhandled error");'
    : "    console.error(err);";

  const appErrorCheck = errorClass
    ? `    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }`
    : "";

  return `${imports.join("\n")}

export function registerModules(app: Express): void {
${registerUses.join("\n")}
}

export function registerErrorHandler(app: Express): void {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
${logStatement}
${appErrorCheck}

    const statusCode = getStatusCode(err);
    if (statusCode < 500) {
      const message = err instanceof Error ? err.message : "Bad Request";
      res.status(statusCode).json({ error: message });
      return;
    }

    res.status(500).json({ error: "Internal Server Error" });
  });
}
${GET_STATUS_CODE}`;
}

function fastifyRegistry(config: ProjectConfig): string {
  const { logger, cors, errorClass, zod } = config.features;

  const imports = [
    'import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";',
  ];
  if (logger) {
    imports.push('import { loggerOptions } from "../utils/logger.js";');
  }
  if (cors) imports.push('import { registerCors } from "./cors.js";');
  if (zod) imports.push('import { registerDemoRoutes } from "./demoRoutes.js";');
  if (errorClass) imports.push('import { AppError } from "../utils/errors.js";');

  const fastifyOptions = logger
    ? "export const fastifyOptions = { logger: { ...loggerOptions } };"
    : "export const fastifyOptions = { logger: false };";

  const registerCalls: string[] = [];
  if (cors) registerCalls.push("  await registerCors(app);");
  if (zod) registerCalls.push("  await registerDemoRoutes(app);");

  const appErrorCheck = errorClass
    ? `    if (err instanceof AppError) {
      reply.status(err.statusCode).send({ error: err.message });
      return;
    }`
    : "";

  return `${imports.join("\n")}

${fastifyOptions}

export async function registerModules(app: FastifyInstance): Promise<void> {
${registerCalls.join("\n")}
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      request.log.error({ err }, "Unhandled error");
${appErrorCheck}

      const statusCode =
        typeof err.statusCode === "number" &&
        err.statusCode >= 400 &&
        err.statusCode < 600
          ? err.statusCode
          : 500;

      if (statusCode < 500) {
        reply.status(statusCode).send({ error: err.message });
        return;
      }

      reply.status(500).send({ error: "Internal Server Error" });
    }
  );
}
`;
}

export async function writeModules(
  config: ProjectConfig,
  targetDir: string
): Promise<void> {
  const source =
    config.framework === "express"
      ? expressRegistry(config)
      : fastifyRegistry(config);

  const modulesDir = path.join(targetDir, "src/modules");
  await fs.mkdir(modulesDir, { recursive: true });
  await fs.writeFile(path.join(modulesDir, "index.ts"), source);

  report("✓ Module registry written");
}
