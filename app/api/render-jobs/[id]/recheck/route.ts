import { assertSameOrigin, handler, json } from "@/lib/api";
import { observeOutfit } from "@/lib/ai/gemini";
import { previewableCategories } from "@/lib/catalogue";
import { currentAssessment, currentRequirements, isUuid, latestObservation, requireOwnedCheck, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { AppError, Errors } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { assess, recheckOutcome } from "@/lib/rules";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * "Check the preview against the rule": the vision model re-reads the *generated* image and the same
 * typed rules run on it. Explicit and cached per result — it's an AI reading, labelled as such.
 */
export const POST = handler("render_recheck", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const id = (await ctx.params).id;
  if (!isUuid(id)) throw Errors.notFound();
  const [job] = await db()`select check_id, finding_id, assessment_id, result_asset_id, status from wearcheck.render_jobs where id = ${id}`;
  if (!job) throw Errors.notFound();
  const check = await requireOwnedCheck(job.check_id as string);
  if (job.status !== "completed" || !job.result_asset_id) throw new AppError("NOT_READY", "The preview isn't ready yet.", 409, true, "WAIT");
  const [assessment, reqs] = await Promise.all([currentAssessment(check), currentRequirements(check)]);
  if (!assessment || !reqs || assessment.id !== job.assessment_id) throw new AppError("STALE_PREVIEW", "This preview belongs to an older version of your check.", 409, true, "NONE");
  const finding = assessment.findings_json.findings.find((f) => f.id === job.finding_id);

  let obs = await latestObservation(check.id, job.result_asset_id as string, reqs.revision);
  if (!obs) {
    await limit("vision", check.guest_session_id, "AI readings");
    await limit("visionGlobal", "global", "AI readings today");
    const [asset] = await db()`select storage_key from wearcheck.media_assets where id = ${job.result_asset_id} and check_id = ${check.id}`;
    const { value, model } = await observeOutfit(await getObject(asset.storage_key as string), reqs.json);
    const [row] = await db()`
      insert into wearcheck.outfit_observations (check_id, photo_asset_id, json, model_id, requirements_revision)
      values (${check.id}, ${job.result_asset_id}, ${db().json(value as never)}, ${model}, ${reqs.revision}) returning *`;
    obs = row as unknown as NonNullable<typeof obs>;
  }
  const after = assess(reqs.json, obs.json, {}, previewableCategories());
  const outcome = recheckOutcome(finding ?? null, after);
  await trackEvent(check.id, "preview_rechecked", { state: outcome.state });
  return json({ ...outcome, model: obs.model_id });
});
