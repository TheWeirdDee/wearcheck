import "server-only";
import { catalogueItem, type CatalogueItem } from "./catalogue";
import { type CheckRow, currentAssessment, currentRequirements, photoAsset } from "./checks";
import { db } from "./db";
import type { JobRow } from "./jobs";
import type { AssessmentResult, Finding, Requirements } from "./schemas";

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
