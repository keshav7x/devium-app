import Fastify from "fastify";
import {
  fastifyOptions,
  registerErrorHandler,
  registerModules,
} from "./modules/index.js";

export async function createApp() {
  const app = Fastify(fastifyOptions);

  app.addHook("onSend", async (_request, reply) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header(
      "content-security-policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      reply.header(
        "strict-transport-security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }
  });

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
