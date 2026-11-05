import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const redact = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers[\"x-api-key\"]",
    "res.headers[\"set-cookie\"]",
  ],
  censor: "[Redacted]",
};

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  redact,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
