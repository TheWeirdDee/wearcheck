// Structured logging that never records invitation text, image bytes, credentials or signed URLs.
const SECRET_PATTERNS = [
  /https?:\/\/[^\s"']+/g, // any URL (signed provider/storage URLs carry credentials)
  /Bearer\s+[A-Za-z0-9._\-+/=]+/gi,
  /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, // JWTs
  /postgres(ql)?:\/\/\S+/gi,
];

export function redact(value: string): string {
  let out = value;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "<redacted>");
  return out.slice(0, 500);
}

function fmt(event: string, meta?: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (typeof v === "string") safe[k] = redact(v);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) safe[k] = v;
  }
  return JSON.stringify({ app: "wearcheck", event, ...safe, at: new Date().toISOString() });
}

export const log = {
  info: (event: string, meta?: Record<string, unknown>) => console.log(fmt(event, meta)),
  warn: (event: string, meta?: Record<string, unknown>) => console.warn(fmt(event, meta)),
  error: (event: string, err: unknown, meta?: Record<string, unknown>) =>
    console.error(fmt(event, { ...meta, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) })),
};
