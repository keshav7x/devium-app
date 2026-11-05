import Fastify from "fastify";
import {
  fastifyOptions,
  registerErrorHandler,
  registerModules,
} from "./modules/index.js";

export async function createApp() {
  const app = Fastify(fastifyOptions);

  registerErrorHandler(app);

  await registerModules(app);

  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({
      status: "OK",
      message: "Server is running",
    });
  });

  return app;
}
