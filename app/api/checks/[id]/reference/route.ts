import { assertSameOrigin, handler, json } from "@/lib/api";
import { requireOwnedCheck, saveAsset } from "@/lib/checks";
import { AppError } from "@/lib/errors";
import { normalizeImage } from "@/lib/images";
import { limit } from "@/lib/rate-limit";
import { RenderCategory } from "@/lib/schemas";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/** "I have another item to try": a user-provided reference photo, marked "Provided by you". */
export const POST = handler("reference_upload", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  await limit("upload", check.guest_session_id, "uploads");
  const { bytes, form } = await readUpload(req);
  const category = RenderCategory.safeParse(form.get("category"));
  if (!category.success) throw new AppError("BAD_CATEGORY", "Please choose what kind of item this is.", 400, true, "NONE");
  if (form.get("rights") !== "accepted") throw new AppError("RIGHTS_REQUIRED", "Please confirm you're allowed to use this image.", 400, true, "NONE");
  const img = await normalizeImage(bytes, "reference_upload");
  const asset = await saveAsset(check.id, "reference_upload", img, `user_reference:${category.data}`);
  return json({ assetId: asset.id, category: category.data, url: `/api/media/${asset.id}` });
});
