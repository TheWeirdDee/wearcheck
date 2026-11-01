import { assertSameOrigin, handler, json } from "@/lib/api";
import { extractInvitation, modelId } from "@/lib/ai/gemini";
import { requireOwnedCheck, saveAsset, setStep, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeImage } from "@/lib/images";
import { limit } from "@/lib/rate-limit";
import { fromExtraction } from "@/lib/requirements";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Upload an invitation image, read it with the vision model, and return draft (unconfirmed) requirements. */
export const POST = handler("invitation_upload", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  await limit("upload", check.guest_session_id, "uploads");
  const { bytes } = await readUpload(req);
  const img = await normalizeImage(bytes, "invitation");
  const asset = await saveAsset(check.id, "invitation", img, "user_upload");
  const [src] = await db()`
    insert into wearcheck.event_sources (check_id, source_type, asset_id, extraction_status, model_id)
    values (${check.id}, 'invitation_image', ${asset.id}, 'running', ${modelId()}) returning id`;
  await trackEvent(check.id, "invitation_added", { kind: "image" });

  try {
    await limit("vision", check.guest_session_id, "AI readings");
    await limit("visionGlobal", "global", "AI readings today");
    const extraction = await extractInvitation(img.bytes);
    if (!extraction.readable || extraction.full_text.trim().length < 3) {
      await db()`update wearcheck.event_sources set extraction_status = 'failed', extraction_error = 'UNREADABLE', extraction_json = ${db().json(extraction as never)} where id = ${src.id}`;
      throw new AppError("INVITATION_UNREADABLE", "We couldn't read text in that image. You can enter the details yourself instead.", 422, true, "ENTER_MANUALLY");
    }
    await db()`update wearcheck.event_sources set extraction_status = 'done', extraction_json = ${db().json(extraction as never)} where id = ${src.id}`;
    await setStep(check.id, "requirements");
    return json({ ok: true, assetId: asset.id, draft: fromExtraction(extraction), nextPath: `/check/${check.id}/requirements` });
  } catch (e) {
    if (e instanceof AppError) {
      await db()`update wearcheck.event_sources set extraction_status = 'failed', extraction_error = ${e.code} where id = ${src.id} and extraction_status = 'running'`;
    }
    throw e;
  }
});
