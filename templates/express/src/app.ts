import express from "express";
import { registerErrorHandler, registerModules } from "./modules/index.js";

function parseTrustProxy(value: string | undefined): boolean | number | string | undefined {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  const count = Number(value);
  return Number.isInteger(count) ? count : value;
}

export function createApp() {
  const app = express();

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) {
    app.set("trust proxy", trustProxy);
  }

  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
    });
    if (process.env.NODE_ENV === "production") {
      res.set(
        "strict-transport-security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }
    next();
  });

  app.use(express.json({ limit: "100kb" }));

  registerModules(app);

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "OK",
      message: "Server is running",
    });
  });

  registerErrorHandler(app);

  return app;
}
