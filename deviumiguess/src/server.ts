import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/index.js";

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Server listening on http://${env.HOST}:${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down gracefully`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  try {
await prisma.$disconnect();
  } catch (error) {
    console.error("Error during cleanup", error);
    process.exit(1);
  }

  process.exit(0);
}

const forceExit = setTimeout(() => {
  console.error("Forced exit after timeout");
  process.exit(1);
}, 10_000);
forceExit.unref();

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
