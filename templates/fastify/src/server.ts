import { createApp } from "./app.js";
import { env } from "./config/env.js";
// {{ormImport}}

const app = await createApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown(signal: string): Promise<void> {
  app.log.info(`${signal} received, shutting down gracefully`);

  try {
    await app.close();
    // {{ormCleanup}}
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  process.exit(0);
}

const forceExit = setTimeout(() => {
  process.exit(1);
}, 10_000);
forceExit.unref();

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
