import { NextResponse } from "next/server";
import { assertSameOrigin, handler, json } from "@/lib/api";
import { currentAssessment, requireOwnedCheck } from "@/lib/checks";
import { deleteCheck } from "@/lib/privacy";

export const runtime = "nodejs";

/** Owned check state and step summary. */
export const GET = handler("check_get", async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const check = await requireOwnedCheck((await ctx.params).id);
  const a = await currentAssessment(check);
  return json({
    checkId: check.id,
    step: check.current_step,
    requirementsRevision: check.requirements_revision,
    hasPhoto: Boolean(check.photo_asset_id),
    assessmentStatus: a?.status ?? null,
    decision: check.decision,
    expiresAt: check.expires_at,
  });
});

/** Deletes the check, its stored images and derived records; access is revoked first. */
export const DELETE = handler("check_delete", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  const r = await deleteCheck(check.id);
  return json({ deleted: true, assets: r.deletedAssets });
});

/** Form fallback for deletion without JavaScript (`<form method="post">` with _method=delete). */
export const POST = handler("check_delete_form", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const form = await req.formData();
  if (form.get("_method") !== "delete") return json({ error: { code: "BAD_METHOD", message: "Unsupported.", retryable: false, action: "NONE" } }, 405);
  const check = await requireOwnedCheck((await ctx.params).id);
  await deleteCheck(check.id);
  return NextResponse.redirect(new URL("/?deleted=1", req.url), 303);
});
