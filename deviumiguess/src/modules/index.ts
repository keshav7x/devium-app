import type { Express, NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { requestLogger } from "./requestLogger.js";
import { corsMiddleware } from "./cors.js";
import { demoRoutes } from "./demoRoutes.js";
import { AppError } from "../utils/errors.js";

export function registerModules(app: Express): void {
  app.use(requestLogger);
  app.use(corsMiddleware);
  app.use(demoRoutes);
}

export function registerErrorHandler(app: Express): void {
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const fallback = (err as { statusCode?: unknown }).statusCode;
    const statusCode = typeof fallback === "number" ? fallback : 500;
    logger.error({ err }, "Unhandled error");
    res.status(statusCode).json({
      error: statusCode >= 500 ? "Internal Server Error" : err.message,
    });
  });
}
