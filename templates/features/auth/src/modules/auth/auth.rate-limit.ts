export type AuthRateLimitResult = "allowed" | "limited" | "unavailable";

export async function consumeAuthAttempt(
  _key: string,
): Promise<AuthRateLimitResult> {
  return "allowed";
}
