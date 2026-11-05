import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { validateBody } from "../utils/validate.js";

const echoSchema = z.object({
  message: z.string().min(1),
});

export async function registerDemoRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/echo",
    { preHandler: validateBody(echoSchema) },
    async (request) => {
      return { echo: request.body };
    }
  );
}
