import { z } from "zod";
import { assertSameOrigin, handler, json, readJson } from "@/lib/api";
import { confirmRequirements, requireOwnedCheck, setStep, trackEvent } from "@/lib/checks";
import { loadDraft } from "@/lib/draft";
import { AppError } from "@/lib/errors";
import { hasMinimumContext, Requirements } from "@/lib/schemas";

export const runtime = "nodejs";

const Body = z.object({ revision: z.number().int().min(0), requirements: Requirements });

/** User confirms (possibly edited) requirements. Creates a new revision and supersedes older assessments. */
export const PUT = handler("requirements_confirm", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  const { revision, requirements } = Body.parse(await readJson(req));
  if (!hasMinimumContext(requirements)) {
    throw new AppError("NEEDS_CONTEXT", "Add an occasion, a dress code, or mark “No restrictions stated” before continuing.", 400, true, "EDIT_REQUIREMENTS");
  }
  // Source honesty: the browser can't mint "From invitation" labels that the extraction didn't produce.
  const draft = await loadDraft(check);
  const allowedEvidence = new Set(
    (draft?.requirements.rules ?? []).filter((r) => r.source === "invitation").map((r) => r.evidence_text),
  );
  if (draft?.requirements.dress_code?.source === "invitation") allowedEvidence.add(draft.requirements.dress_code.evidence_text);
  if (draft?.requirements.venue.source === "invitation") allowedEvidence.add(draft.requirements.venue.evidence_text);
  for (const r of requirements.rules) {
    if (r.source === "invitation" && !allowedEvidence.has(r.evidence_text)) throw new AppError("BAD_SOURCE", "A requirement was marked as from the invitation but doesn't match it.", 400);
  }
  if (requirements.dress_code?.source === "invitation" && !allowedEvidence.has(requirements.dress_code.evidence_text)) throw new AppError("BAD_SOURCE", "The dress code was marked as from the invitation but doesn't match it.", 400);
  if (requirements.venue.source === "invitation" && !allowedEvidence.has(requirements.venue.evidence_text)) throw new AppError("BAD_SOURCE", "The venue was marked as from the invitation but doesn't match it.", 400);

  const result = await confirmRequirements(check.id, revision, requirements, draft?.modelId ?? null);
  if (!result.ok) throw new AppError("REVISION_CONFLICT", "These requirements were changed in another tab. Please reload.", 409, true, "RETRY");
  await setStep(check.id, check.photo_asset_id ? "assessment" : "outfit");
  await trackEvent(check.id, "requirements_confirmed", { rules: requirements.rules.length, revision: result.revision });
  return json({ revision: result.revision, confirmed: true, nextPath: `/check/${check.id}/outfit` });
});
