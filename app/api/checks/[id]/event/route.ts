import { assertSameOrigin, handler, json, readJson } from "@/lib/api";
import { requireOwnedCheck, setStep, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { ManualDetails } from "@/lib/schemas";

export const runtime = "nodejs";

/** Manual event entry. Stores the typed details; the user confirms them on the requirements step. */
export const PUT = handler("event_manual", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  const details = ManualDetails.parse(await readJson(req));
  await db()`insert into wearcheck.event_sources (check_id, source_type, manual_json) values (${check.id}, 'manual', ${db().json(details as never)})`;
  await setStep(check.id, "requirements");
  await trackEvent(check.id, "invitation_added", { kind: "manual" });
  return json({ ok: true, nextPath: `/check/${check.id}/requirements` });
});
