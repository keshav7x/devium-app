import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const sanitizeUrl = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const query = value.indexOf("?");
  const fragment = value.indexOf("#");
  const end = query === -1
    ? fragment
    : fragment === -1
      ? query
      : Math.min(query, fragment);
  return end === -1 ? value : value.slice(0, end);
};

const requestSerializer = (req: any) => ({
  id: req.id,
  method: req.method,
  url: sanitizeUrl(req.url),
  remoteAddress: req.remoteAddress,
  headers: req.headers,
});

const redact = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers[\"proxy-authorization\"]",
    "req.headers[\"x-api-key\"]",
    "req.headers[\"x-auth-token\"]",
    "res.headers[\"set-cookie\"]",
  ],
  censor: "[Redacted]",
};

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  redact,
  serializers: {
    req: requestSerializer,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
