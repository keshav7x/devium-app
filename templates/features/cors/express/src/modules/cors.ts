import cors from "cors";

// Secure default: no cross-origin access unless CORS_ORIGIN is set.
// Set CORS_ORIGIN to a comma-separated allowlist, e.g. https://app.example.com
const origins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: origins && origins.length > 0 ? origins : false,
});
