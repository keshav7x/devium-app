import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
