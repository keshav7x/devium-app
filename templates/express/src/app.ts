import express from "express";
import { registerErrorHandler, registerModules } from "./modules/index.js";

export function createApp() {
  const app = express();

  app.use(express.json());

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
