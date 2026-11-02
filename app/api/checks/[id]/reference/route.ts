import { assertSameOrigin, handler, json } from "@/lib/api";
import { currentAssessment, currentRequirements, requireOwnedCheck, saveAsset } from "@/lib/checks";
import { observeReference } from "@/lib/ai/gemini";
import { referenceProblem } from "@/lib/reference-validation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeImage } from "@/lib/images";
import { limit } from "@/lib/rate-limit";
import { RenderCategory } from "@/lib/schemas";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

/** "I have another item to try": a user-provided reference photo, marked "Provided by you". */
export const POST = handler("reference_upload", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  await limit("upload", check.guest_session_id, "uploads");
  const { bytes, form } = await readUpload(req);
  const category = RenderCategory.safeParse(form.get("category"));
  if (!category.success) throw new AppError("BAD_CATEGORY", "Please choose what kind of item this is.", 400, true, "NONE");
  if (form.get("rights") !== "accepted") throw new AppError("RIGHTS_REQUIRED", "Please confirm you're allowed to use this image.", 400, true, "NONE");
  // The photo must support this change (e.g. shoes need visible feet), checked here as well as in the UI.
  const support = (await currentAssessment(check))?.findings_json.photo_supports?.[category.data];
  if (!support?.ok) throw new AppError("PHOTO_UNSUPPORTED", `This photo can't be used for that change: ${support?.reason ?? "Re-read your photo on the assessment first."}`, 422, true, "RETAKE_PHOTO");
  const img = await normalizeImage(bytes, "reference_upload");
  const reqs = await currentRequirements(check);
  if (!reqs) throw new AppError("STALE_ASSESSMENT", "Confirm your requirements first.", 409);
  await limit("vision", check.guest_session_id, "AI readings");
  await limit("visionGlobal", "global", "AI readings today");
  const reading = await observeReference(img.bytes, reqs.json);
  const problem = referenceProblem(reading.value, category.data, reqs.json);
  if (problem) throw new AppError("REFERENCE_NOT_SUITABLE", problem, 422, true, "REPLACE_FILE");
  const asset = await saveAsset(check.id, "reference_upload", img, `user_reference:${category.data}`);
  await db()`update wearcheck.media_assets set reference_validation = ${db().json({ revision: reqs.revision, model: reading.model, observation: reading.value } as never)} where id = ${asset.id} and check_id = ${check.id}`;
  return json({ assetId: asset.id, category: category.data, url: `/api/media/${asset.id}` });
});
