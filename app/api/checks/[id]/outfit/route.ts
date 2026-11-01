import { assertSameOrigin, handler, json } from "@/lib/api";
import { requireOwnedCheck, saveAsset, setStep, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeImage } from "@/lib/images";
import { limit } from "@/lib/rate-limit";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

const CONSENT_STATEMENT_VERSION = "outfit-consent-v1";

/** Upload the outfit photo. Consent is required and recorded before anything is stored. */
export const PUT = handler("outfit_upload", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  await limit("upload", check.guest_session_id, "uploads");
  const { bytes, form } = await readUpload(req);
  if (form.get("consent") !== "accepted") {
    throw new AppError("CONSENT_REQUIRED", "Please confirm this is your photo (or you have permission) and that the person is an adult.", 400, true, "NONE");
  }
  const img = await normalizeImage(bytes, "outfit");
  const [consent] = await db()`
    insert into wearcheck.consent_records (check_id, statement_version, source)
    values (${check.id}, ${CONSENT_STATEMENT_VERSION}, 'outfit_upload_checkbox') returning id`;
  const asset = await saveAsset(check.id, "outfit", img, "user_upload", consent.id as string);
  // A new photo invalidates every prior assessment (renders stay attached to their own old assessment).
  await db().begin(async (sql) => {
    await sql`update wearcheck.checks set photo_asset_id = ${asset.id}, decision = null, decision_render_job_id = null, status = 'active', updated_at = now() where id = ${check.id}`;
    await sql`update wearcheck.assessments set superseded_at = now() where check_id = ${check.id} and superseded_at is null`;
  });
  await setStep(check.id, "assessment");
  await trackEvent(check.id, "photo_accepted", { width: img.width, height: img.height });
  return json({ assetId: asset.id, width: img.width, height: img.height, url: `/api/media/${asset.id}` });
});
