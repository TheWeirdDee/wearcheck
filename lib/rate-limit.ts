import "server-only";
import { db } from "./db";
import { Errors } from "./errors";
import { hashForRateLimit } from "./session";
import type { TransactionSql } from "postgres";

export const LIMITS = {
  guestStart: { max: 20, windowSec: 3600 },
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
  await db().begin((tx) => limitInTransaction(tx, bucket, key, what));
}

export async function limitInTransaction(tx: TransactionSql, bucket: keyof typeof LIMITS, key: string, what: string) {
  const { max, windowSec } = LIMITS[bucket];
  const keyHash = hashForRateLimit(key);
  // Count and insert atomically per bucket+key, so parallel requests can't all slip under the limit.
  const allowed = await (async () => {
    await tx`select pg_advisory_xact_lock(hashtext(${`wearcheck:rate:${bucket}:${keyHash}`}))`;
    const [{ n, retry_after }] = await tx`
      select count(*)::int as n, greatest(1, ceil(extract(epoch from (min(created_at) + make_interval(secs => ${windowSec}) - now()))))::int as retry_after from wearcheck.rate_events
      where bucket = ${bucket} and key_hash = ${keyHash} and created_at > now() - make_interval(secs => ${windowSec})`;
    if (n >= max) return retry_after as number;
    await tx`insert into wearcheck.rate_events (bucket, key_hash) values (${bucket}, ${keyHash})`;
    return null;
  })();
  if (allowed !== null) throw Errors.rateLimited(what, allowed);
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
