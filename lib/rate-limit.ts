import "server-only";
import { db } from "./db";
import { Errors } from "./errors";
import { hashForRateLimit } from "./session";

export const LIMITS = {
  createCheck: { max: 20, windowSec: 3600 },
  upload: { max: 30, windowSec: 3600 },
  vision: { max: 20, windowSec: 3600 },
  visionGlobal: { max: 200, windowSec: 86400 },
  renderSubmit: { max: 6, windowSec: 3600 },
} as const;

/**
 * Durable sliding-window limiter backed by wearcheck.rate_events (works across serverless instances).
 * Records the attempt only when it is allowed.
 */
export async function limit(bucket: keyof typeof LIMITS, key: string, what: string) {
  const { max, windowSec } = LIMITS[bucket];
  const keyHash = hashForRateLimit(key);
  const sql = db();
  const [{ n }] = await sql`
    select count(*)::int as n from wearcheck.rate_events
    where bucket = ${bucket} and key_hash = ${keyHash} and created_at > now() - make_interval(secs => ${windowSec})`;
  if (n >= max) throw Errors.rateLimited(what);
  await sql`insert into wearcheck.rate_events (bucket, key_hash) values (${bucket}, ${keyHash})`;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
