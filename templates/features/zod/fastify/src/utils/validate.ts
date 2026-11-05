import type { FastifyRequest } from "fastify";
import { z } from "zod";

export function validateBody(schema: z.ZodType) {
  return async (request: FastifyRequest): Promise<void> => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const error = new Error("Validation failed") as Error & {
        statusCode: number;
      };
      error.statusCode = 400;
      throw error;
    }

    request.body = result.data;
  };
}
