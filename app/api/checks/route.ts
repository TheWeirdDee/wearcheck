import { after, NextResponse } from "next/server";
import { assertSameOrigin, handler, json } from "@/lib/api";
import { admitCheck, trackEvent } from "@/lib/checks";
import { DEMO_CASES, startDemoCheck } from "@/lib/demo";
import { isUuid } from "@/lib/checks";
import { cleanupExpired } from "@/lib/privacy";
import { currentGuest, ensureGuest } from "@/lib/session";
import { clientIp, limit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Creates a guest-owned check. Accepts a plain form POST (works without JS) or fetch. */
const create = handler("create_check", async (req: Request) => {
  assertSameOrigin(req);
  let demo: string | null = null;
  let requestId: string | null = null;
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    demo = String(form.get("demo") ?? "") || null;
    requestId = String(form.get("requestId") ?? "") || null;
  } else if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { demo?: string; requestId?: string };
    demo = body.demo ?? null;
    requestId = body.requestId ?? null;
  }
  if (demo && !DEMO_CASES.some((d) => d.slug === demo)) demo = null;

  if (!(await currentGuest())) await limit("guestStart", clientIp(req), "new browser sessions on this network");
  const guest = await ensureGuest();
  if (requestId && !isUuid(requestId)) requestId = null;
  // Session scope prevents people on a shared network consuming one another's allowance.
  // Provider spending has separate global atomic caps, independent of this navigation quota.
  const { check, replay } = await admitCheck(guest.id, demo, requestId);
  if (replay) {
    const nextPath = `/check/${check.id}/${check.current_step}`;
    return type.includes("application/json") ? json({ checkId: check.id, nextPath }) : NextResponse.redirect(new URL(nextPath, req.url), 303);
  }
  await trackEvent(check.id, "check_started", { demo: demo ?? "none" });
  // Opportunistic retention enforcement between daily cron runs.
  after(() => cleanupExpired(5).catch(() => {}));
  const nextPath = demo ? await startDemoCheck(check, demo) : `/check/${check.id}/invitation`;

  if (type.includes("application/json")) return NextResponse.json({ checkId: check.id, nextPath }, { status: 201 });
  return NextResponse.redirect(new URL(nextPath, req.url), 303);
});

export async function POST(req: Request) {
  const response = await create(req);
  if (response.status >= 400 && !(req.headers.get("content-type") ?? "").includes("application/json")) {
    const destination = new URL("/check/new", req.url);
    destination.searchParams.set("startError", response.status === 429 ? "limit" : "unavailable");
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) destination.searchParams.set("retryAfter", retryAfter);
    const redirect = NextResponse.redirect(destination, 303);
    // Preserve a newly issued guest cookie even when its request is rate limited.
    for (const cookie of response.headers.getSetCookie()) redirect.headers.append("Set-Cookie", cookie);
    return redirect;
  }
  return response;
}
