import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../utils/validate.js";

const echoSchema = z.object({
  message: z.string().min(1),
});

export const demoRoutes = Router();

demoRoutes.post("/api/echo", validateBody(echoSchema), (req, res) => {
  res.status(200).json({ echo: req.body });
});
