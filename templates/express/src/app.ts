import express from "express";
import { registerErrorHandler, registerModules } from "./modules/index.js";

export function createApp() {
  const app = express();

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
