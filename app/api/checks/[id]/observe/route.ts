import { z } from "zod";
import { assertSameOrigin, handler, json, readJson } from "@/lib/api";
import { modelId, observeOutfit } from "@/lib/ai/gemini";
import { currentRequirements, latestObservation, photoAsset, requireOwnedCheck } from "@/lib/checks";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ photoAssetId: z.uuid(), force: z.boolean().optional() });

/** Pipeline step 1: structured, observable outfit facts from the vision model (once per photo). */
export const POST = handler("observe", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  const body = Body.parse(await readJson(req));
  if (body.photoAssetId !== check.photo_asset_id) throw new AppError("STALE_INPUT", "Your photo changed. Reloading.", 409, true, "RETRY");
  const reqs = await currentRequirements(check);
  if (!reqs) throw new AppError("REQUIREMENTS_UNCONFIRMED", "Please confirm the event requirements first.", 409, true, "EDIT_REQUIREMENTS");
  const photo = await photoAsset(check);
  if (!photo) throw new AppError("NO_PHOTO", "Please add your outfit photo first.", 409, true, "RETAKE_PHOTO");

  const existing = await latestObservation(check.id, photo.id);
  // Rule checks depend on the rule ids, so re-observe when the requirements revision introduced new free-text rules.
  const needsRuleChecks = reqs.json.rules.some((r) => ["garment_exclusion", "garment_requirement", "coverage", "other"].includes(r.type) && !existing?.json.rule_checks.some((c) => c.rule_id === r.id));
  if (existing && !body.force && !needsRuleChecks) return json({ observationId: existing.id, cached: true });

  await limit("vision", check.guest_session_id, "AI readings");
  await limit("visionGlobal", "global", "AI readings today");
  const observation = await observeOutfit(await getObject(photo.storage_key), reqs.json);
  const [row] = await db()`
    insert into wearcheck.outfit_observations (check_id, photo_asset_id, json, user_corrections, model_id)
    values (${check.id}, ${photo.id}, ${db().json(observation as never)}, ${db().json((existing?.user_corrections ?? {}) as never)}, ${modelId()}) returning id`;
  return json({ observationId: row.id, cached: false });
});
