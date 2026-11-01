import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { env } from "./env";

/** App retention policy for guest data (WearCheck policy, not a provider guarantee). */
export const GUEST_RETENTION_HOURS = 24;

const secureCookies = () => env().APP_ORIGIN.startsWith("https://");
export const cookieName = () => (secureCookies() ? "__Host-wc_guest" : "wc_guest");

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sign = (token: string) => createHmac("sha256", env().SESSION_SECRET).update(token).digest("base64url");

function verify(raw: string | undefined): string | null {
  if (!raw) return null;
  const [token, mac] = raw.split(".");
  if (!token || !mac || token.length < 40) return null;
  const expected = Buffer.from(sign(token));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return token;
}

export type Guest = { id: string };

/** Resolves the current guest from the signed cookie and the server-side session row. */
export async function currentGuest(): Promise<Guest | null> {
  const token = verify((await cookies()).get(cookieName())?.value);
  if (!token) return null;
  const rows = await db()`
    update wearcheck.guest_sessions set last_seen_at = now()
    where token_hash = ${sha256(token)} and expires_at > now()
    returning id`;
  return rows[0] ? { id: rows[0].id as string } : null;
}

/** Returns the existing guest or creates a new one and sets the cookie. Route handlers only. */
export async function ensureGuest(): Promise<Guest> {
  const existing = await currentGuest();
  if (existing) {
    // Sliding expiry: keep the session alive as long as its newest check.
    await db()`update wearcheck.guest_sessions set expires_at = greatest(expires_at, now() + make_interval(hours => ${GUEST_RETENTION_HOURS})) where id = ${existing.id}`;
    return existing;
  }
  const token = randomBytes(32).toString("base64url");
  const rows = await db()`
    insert into wearcheck.guest_sessions (token_hash, expires_at)
    values (${sha256(token)}, now() + make_interval(hours => ${GUEST_RETENTION_HOURS}))
    returning id`;
  (await cookies()).set(cookieName(), `${token}.${sign(token)}`, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_RETENTION_HOURS * 3600,
  });
  return { id: rows[0].id as string };
}

export function hashForRateLimit(value: string) {
  return createHmac("sha256", env().SESSION_SECRET).update(`rl:${value}`).digest("hex").slice(0, 32);
}
