import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";

function redisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL environment variable is required for auth rate limiting.",
    );
  }
  return url;
}

const redis = new Redis(redisUrl(), {
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
});

const limiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "auth",
  points: 10,
  duration: 60,
});

export async function consumeAuthAttempt(key: string): Promise<boolean> {
  try {
    await limiter.consume(key, 1);
    return true;
  } catch {
    return false;
  }
}
