import type { ProjectConfig } from "../types/project";

function expressRegistry(config: ProjectConfig): string {
  const { features } = config;
  const imports = [
    'import type { Express, NextFunction, Request, Response } from "express";',
  ];
  const registrations: string[] = [];
  const errorLines: string[] = [];

  if (features.logger) {
    imports.push('import { logger } from "../utils/logger.js";');
    imports.push('import { requestLogger } from "./requestLogger.js";');
    registrations.push("  app.use(requestLogger);");
  }
  if (features.cors) {
    imports.push('import { corsMiddleware } from "./cors.js";');
    registrations.push("  app.use(corsMiddleware);");
  }
  if (features.zod) {
    imports.push('import { demoRoutes } from "./demoRoutes.js";');
    registrations.push(
      "  if (process.env.NODE_ENV !== \"production\") app.use(demoRoutes);",
    );
  }
  if (features.errorClass) {
    imports.push('import { AppError } from "../utils/errors.js";');
    errorLines.push("    if (err instanceof AppError) {");
    errorLines.push(
      "      res.status(err.statusCode).json({ error: err.statusCode >= 500 ? \"Internal Server Error\" : err.message });",
    );
    errorLines.push("      return;");
    errorLines.push("    }");
  }

  errorLines.push(
    "    const fallback = (err as { statusCode?: unknown }).statusCode;",
    "    const statusCode = typeof fallback === \"number\" && Number.isInteger(fallback) && fallback >= 400 && fallback <= 499 ? fallback : 500;",
  );
  if (features.logger) {
    errorLines.push('    logger.error({ err }, "Unhandled error");');
  } else {
    errorLines.push("    console.error(err);");
  }
  errorLines.push(
    "    res.status(statusCode).json({",
    '      error: statusCode >= 500 ? "Internal Server Error" : err instanceof Error ? err.message : "Bad Request",',
    "    });",
  );

  const registerModules =
    registrations.length > 0
      ? `export function registerModules(app: Express): void {\n${registrations.join("\n")}\n}`
      : "export function registerModules(_app: Express): void {}";

  return `${imports.join("\n")}

${registerModules}

export function registerErrorHandler(app: Express): void {
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
${errorLines.join("\n")}
  });
}
`;
}

function fastifyRegistry(config: ProjectConfig): string {
  const { features } = config;
  const imports = [
    'import type { FastifyInstance, FastifyServerOptions } from "fastify";',
  ];
  const registrations: string[] = [];
  const errorLines: string[] = [];

  let fastifyOptionsBody = "{}";
  if (features.logger) {
    imports.push('import { loggerOptions } from "../utils/logger.js";');
    fastifyOptionsBody = "{\n  logger: {\n    ...loggerOptions,\n  },\n}";
  }
  if (features.cors) {
    imports.push('import { registerCors } from "./cors.js";');
    registrations.push("  await registerCors(app);");
  }
  if (features.zod) {
    imports.push('import { registerDemoRoutes } from "./demoRoutes.js";');
    registrations.push(
      "  if (process.env.NODE_ENV !== \"production\") await registerDemoRoutes(app);",
    );
  }
  if (features.errorClass) {
    imports.push('import { AppError } from "../utils/errors.js";');
    errorLines.push("    if (err instanceof AppError) {");
    errorLines.push(
      "      reply.status(err.statusCode).send({ error: err.statusCode >= 500 ? \"Internal Server Error\" : err.message });",
    );
    errorLines.push("      return;");
    errorLines.push("    }");
  }

  errorLines.push(
    "    const fallback = (err as { statusCode?: unknown }).statusCode;",
    "    const statusCode = typeof fallback === \"number\" && Number.isInteger(fallback) && fallback >= 400 && fallback <= 499 ? fallback : 500;",
    '    app.log.error({ err }, "Unhandled error");',
    "    reply.status(statusCode).send({",
    '      error: statusCode >= 500 ? "Internal Server Error" : err instanceof Error ? err.message : "Bad Request",',
    "    });",
  );

  const registerModules =
    registrations.length > 0
      ? `export async function registerModules(app: FastifyInstance): Promise<void> {\n${registrations.join("\n")}\n}`
      : "export async function registerModules(_app: FastifyInstance): Promise<void> {}";

  return `${imports.join("\n")}

export const fastifyOptions: FastifyServerOptions = ${fastifyOptionsBody};

${registerModules}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, _request, reply) => {
${errorLines.join("\n")}
  });
}
`;
}

export function buildRegistrySource(config: ProjectConfig): string {
  return config.framework === "express"
    ? expressRegistry(config)
    : fastifyRegistry(config);
}
