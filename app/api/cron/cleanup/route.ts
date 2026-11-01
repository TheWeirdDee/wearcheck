import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { advanceJob } from "@/lib/jobs";
import { log } from "@/lib/log";
import { cleanupExpired } from "@/lib/privacy";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request) {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Scheduled: reconcile in-flight render jobs, then enforce WearCheck-only retention. */
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const active = await db()`
    select id from wearcheck.render_jobs
    where status in ('submitted','processing','delayed','persisting_result','validating','uploading_source','uploading_reference')
    order by created_at limit 25`;
  let reconciled = 0;
  for (const j of active) {
    try {
      await advanceJob(j.id as string);
      reconciled++;
    } catch (e) {
      log.error("cron_reconcile", e);
    }
  }
  const cleaned = await cleanupExpired();
  log.info("cron_cleanup", { reconciled, ...cleaned });
  return Response.json({ reconciled, ...cleaned });
}
