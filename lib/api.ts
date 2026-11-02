import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, envelope } from "./errors";
import { allowedOrigins } from "./env";
import { log } from "./log";

/** Rejects state-changing requests whose Origin (or Referer) isn't WearCheck's own. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? (req.headers.get("referer") ? new URL(req.headers.get("referer")!).origin : null);
  const self = new URL(req.url).origin;
  const ok = origin !== null && (origin === self || allowedOrigins().includes(origin));
  if (!ok) throw new AppError("BAD_ORIGIN", "This request didn't come from WearCheck.", 403);
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new AppError("BAD_ORIGIN", "This request didn't come from WearCheck.", 403);
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Wraps a route handler: consistent error envelope, no leaking of internals. */
export function handler<A extends unknown[]>(name: string, fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AppError) {
        if (e.status >= 500) log.warn(name, { code: e.code });
        return NextResponse.json(envelope(e), { status: e.status, headers: { "Cache-Control": "private, no-store", ...(e.retryAfter !== null ? { "Retry-After": String(e.retryAfter), "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + e.retryAfter) } : {}) } });
      }
      if (e instanceof ZodError) {
        const err = new AppError("INVALID_INPUT", "Some of the details sent weren't valid.", 400, true, "RETRY");
        return NextResponse.json(envelope(err), { status: 400 });
      }
      log.error(name, e);
      const err = new AppError("INTERNAL", "Something went wrong on our side. Your check is saved; please try again.", 500, true, "RETRY");
      return NextResponse.json(envelope(err), { status: 500 });
    }
  };
}

export async function readJson(req: Request, maxBytes = 64_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new AppError("PAYLOAD_TOO_LARGE", "That request was too large.", 413);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("INVALID_INPUT", "The request body wasn't valid JSON.", 400);
  }
}
