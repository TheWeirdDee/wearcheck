import "server-only";
import { catalogueItem, type CatalogueItem } from "./catalogue";
import { type CheckRow, currentAssessment, currentRequirements, photoAsset } from "./checks";
import { db } from "./db";
import type { JobRow } from "./jobs";
import { type AssessmentResult, type Finding, type Requirements, COLOUR_LABEL } from "./schemas";

export type DecisionData = {
  check: CheckRow;
  requirements: Requirements;
  assessmentId: string;
  result: AssessmentResult;
  keyFinding: Finding | null;
  decision: "keep" | "change";
  photoAssetId: string;
  job: JobRow | null;
  item: CatalogueItem | null;
  userRefAssetId: string | null;
  generatedAt: Date;
};

/** Everything the decision page and card need; only valid for the current assessment. */
export async function loadDecision(check: CheckRow): Promise<DecisionData | null> {
  if (!check.decision) return null;
  const [reqs, assessment, photo] = await Promise.all([currentRequirements(check), currentAssessment(check), photoAsset(check)]);
  if (!reqs || !assessment || !photo) return null;
  let job: JobRow | null = null;
  if (check.decision === "change" && check.decision_render_job_id) {
    const [j] = await db()`select * from wearcheck.render_jobs where id = ${check.decision_render_job_id} and check_id = ${check.id} and assessment_id = ${assessment.id} and status = 'completed'`;
    job = (j as unknown as JobRow) ?? null;
  }
  const result = assessment.findings_json;
  const keyFinding = (job?.finding_id ? result.findings.find((f) => f.id === job!.finding_id) : null) ?? result.findings.find((f) => f.id === result.key_finding_id) ?? null;
  const [card] = await db()`select created_at from wearcheck.decision_cards where check_id = ${check.id} order by created_at desc limit 1`;
  return {
    check,
    requirements: reqs.json,
    assessmentId: assessment.id,
    result,
    keyFinding,
    decision: job ? "change" : "keep",
    photoAssetId: photo.id,
    job,
    item: job?.catalogue_item_id ? catalogueItem(job.catalogue_item_id) : null,
    userRefAssetId: job?.user_ref_asset_id ?? null,
    generatedAt: (card?.created_at as Date) ?? new Date(),
  };
}

export const SOURCE_LABEL: Record<string, string> = {
  invitation: "From invitation",
  user: "Entered by you",
  suggested: "Suggested — confirmed by you",
  photo_model: "AI observation from your photo",
  user_correction: "Confirmed by you",
};

export function dressCodeSource(r: Requirements): string {
  if (r.origin === "demo_manual") return "Entered for this example (not an invitation)";
  if (r.dress_code) return `${r.dress_code.value} · ${SOURCE_LABEL[r.dress_code.source]}`;
  return r.origin === "invitation_image" ? "Invitation (no clear dress code found)" : "Entered by you";
}

export const CARD_DISCLAIMER = "Style guidance, not event organiser approval or a guarantee of fit.";

/**
 * A successful render is not a resolved requirement: WearCheck doesn't re-observe the generated image,
 * so the preview and the card tell the person exactly what to check themselves.
 */
export function unresolvedNote(finding: Finding, r: Requirements): string | null {
  const rule = finding.rule_id ? r.rules.find((x) => x.id === finding.rule_id) : null;
  const quote = rule ? `“${rule.evidence_text ?? rule.summary}”` : null;
  if (rule?.type === "colour_exclusion") {
    return `WearCheck doesn't re-check the generated image. If any ${rule.colours.map((c) => COLOUR_LABEL[c]).join(" or ")} clothing is still visible in the preview — a layer underneath, cuffs, a collar — it hasn't resolved ${quote}.`;
  }
  if (rule && (rule.type === "footwear_preference" || rule.type === "footwear_requirement")) {
    return `WearCheck doesn't re-check the generated image. Look at the shoes in the preview and judge whether they meet ${quote}; it shows appearance, not grip or comfort on the ground.`;
  }
  if (quote) return `WearCheck doesn't re-check the generated image against ${quote}. Judge for yourself whether the preview meets it.`;
  if (finding.kind === "practical") return "WearCheck doesn't re-check the generated image. It shows appearance only, not how the shoes behave on the ground.";
  return null;
}
