import { createHash } from "node:crypto";
import { z } from "zod";
import { assertSameOrigin, handler, json, readJson } from "@/lib/api";
import { modelId, observeOutfit } from "@/lib/ai/gemini";
import { previewableCategories } from "@/lib/catalogue";
import { currentAssessment, currentRequirements, latestObservation, photoAsset, requireOwnedCheck, setStep, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { assess } from "@/lib/rules";
import { UserCorrections } from "@/lib/schemas";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  requirementsRevision: z.number().int().min(1),
  photoAssetId: z.uuid(),
  corrections: UserCorrections.optional(),
  reobserve: z.boolean().optional(),
});

/**
 * Builds the assessment for the current requirements revision + photo.
 * Observations come from the vision model once per photo; user corrections re-run only the typed rules.
 */
export const POST = handler("assessment", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  const body = Body.parse(await readJson(req));
  if (body.requirementsRevision !== check.requirements_revision || body.photoAssetId !== check.photo_asset_id) {
    throw new AppError("STALE_INPUT", "Your requirements or photo changed. Reloading the latest version.", 409, true, "RETRY");
  }
  const reqs = await currentRequirements(check);
  if (!reqs) throw new AppError("REQUIREMENTS_UNCONFIRMED", "Please confirm the event requirements first.", 409, true, "EDIT_REQUIREMENTS");
  const photo = await photoAsset(check);
  if (!photo) throw new AppError("NO_PHOTO", "Please add your outfit photo first.", 409, true, "RETAKE_PHOTO");

  let obs = await latestObservation(check.id, photo.id);
  if (!obs || body.reobserve) {
    await limit("vision", check.guest_session_id, "AI readings");
    await limit("visionGlobal", "global", "AI readings today");
    const observation = await observeOutfit(await getObject(photo.storage_key), reqs.json);
    const [row] = await db()`
      insert into wearcheck.outfit_observations (check_id, photo_asset_id, json, model_id)
      values (${check.id}, ${photo.id}, ${db().json(observation as never)}, ${modelId()}) returning *`;
    obs = row as unknown as NonNullable<typeof obs>;
  }
  if (body.corrections) {
    const merged = { ...obs.user_corrections, ...body.corrections, rule_answers: { ...(obs.user_corrections.rule_answers ?? {}), ...(body.corrections.rule_answers ?? {}) } };
    const parsed = UserCorrections.parse(merged);
    await db()`update wearcheck.outfit_observations set user_corrections = ${db().json(parsed as never)} where id = ${obs.id}`;
    obs = { ...obs, user_corrections: parsed };
  }

  const corrHash = createHash("sha256").update(JSON.stringify(obs.user_corrections ?? {})).digest("hex").slice(0, 16);
  const existing = await currentAssessment(check);
  if (existing && existing.observation_id === obs.id && existing.corrections_hash === corrHash) {
    return json({ assessmentId: existing.id, result: existing.findings_json });
  }

  const result = assess(reqs.json, obs.json, obs.user_corrections ?? {}, previewableCategories());
  const created = await db().begin(async (sql) => {
    // Re-check the revision inside the transaction so a concurrent edit can't be overwritten by a stale result.
    const [c] = await sql`select requirements_revision, photo_asset_id from wearcheck.checks where id = ${check.id} for update`;
    if (c.requirements_revision !== reqs.revision || c.photo_asset_id !== photo.id) return null;
    await sql`update wearcheck.assessments set superseded_at = now() where check_id = ${check.id} and superseded_at is null`;
    const [a] = await sql`
      insert into wearcheck.assessments (check_id, requirements_revision, photo_asset_id, observation_id, corrections_hash, status, findings_json)
      values (${check.id}, ${reqs.revision}, ${photo.id}, ${obs.id}, ${corrHash}, ${result.status}, ${sql.json(result as never)}) returning id`;
    return a.id as string;
  });
  if (!created) throw new AppError("STALE_INPUT", "Your requirements or photo changed while we were checking. Reloading.", 409, true, "RETRY");
  await setStep(check.id, "assessment");
  await trackEvent(check.id, "assessment_completed", { status: result.status });
  return json({ assessmentId: created, result });
});
