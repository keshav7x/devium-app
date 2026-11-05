const isProduction = process.env.NODE_ENV === "production";

const firstUrlSeparatorOrNull = (value: string): number | null => {
  const positions = [value.indexOf("?"), value.indexOf("#")]
    .filter((position) => position !== -1);

  return positions.length === 0 ? null : Math.min(...positions);
};

const sanitizeUrl = (value: unknown): unknown => {
  if (typeof value !== "string") return value;

  const end = firstUrlSeparatorOrNull(value);
  return end === null ? value : value.slice(0, end);
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

export const loggerOptions = {
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
};
