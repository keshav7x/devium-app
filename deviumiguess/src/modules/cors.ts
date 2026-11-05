import cors from "cors";

const origins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: origins && origins.length > 0 ? origins : true,
});
