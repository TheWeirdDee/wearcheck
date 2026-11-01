import { after, NextResponse } from "next/server";
import { assertSameOrigin, handler } from "@/lib/api";
import { createCheck, trackEvent } from "@/lib/checks";
import { DEMO_CASES, startDemoCheck } from "@/lib/demo";
import { clientIp, limit } from "@/lib/rate-limit";
import { cleanupExpired } from "@/lib/privacy";
import { ensureGuest } from "@/lib/session";

export const runtime = "nodejs";

/** Creates a guest-owned check. Accepts a plain form POST (works without JS) or fetch. */
export const POST = handler("create_check", async (req: Request) => {
  assertSameOrigin(req);
  await limit("createCheck", clientIp(req), "new checks");
  let demo: string | null = null;
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    demo = String((await req.formData()).get("demo") ?? "") || null;
  } else if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { demo?: string };
    demo = body.demo ?? null;
  }
  if (demo && !DEMO_CASES.some((d) => d.slug === demo)) demo = null;

  const guest = await ensureGuest();
  const check = await createCheck(guest.id, demo);
  await trackEvent(check.id, "check_started", { demo: demo ?? "none" });
  // Opportunistic retention enforcement between daily cron runs.
  after(() => cleanupExpired(5).catch(() => {}));
  const nextPath = demo ? await startDemoCheck(check, demo) : `/check/${check.id}/invitation`;

  if (type.includes("application/json")) return NextResponse.json({ checkId: check.id, nextPath }, { status: 201 });
  return NextResponse.redirect(new URL(nextPath, req.url), 303);
});
