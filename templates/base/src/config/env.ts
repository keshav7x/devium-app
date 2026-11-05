import "dotenv/config";

const nodeEnv = process.env.NODE_ENV ?? "development";
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "localhost";
const databaseUrl = process.env.DATABASE_URL;

export const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  HOST: host,
  DATABASE_URL: databaseUrl,
};

export type Env = typeof env;
