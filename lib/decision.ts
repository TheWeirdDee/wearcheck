import "server-only";
import { catalogueItem, type CatalogueItem } from "./catalogue";
import { previewableCategories } from "./catalogue";
import { type CheckRow, currentAssessment, currentRequirements, latestObservation, photoAsset } from "./checks";
import { db } from "./db";
import type { JobRow } from "./jobs";
import { assess, recheckOutcome, type RecheckState } from "./rules";
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
  recheck: { state: RecheckState; note: string } | null;
};

/** The AI re-reading of a generated preview, if the person asked for one. Null means "not re-checked". */
export async function previewRecheck(checkId: string, resultAssetId: string | null, finding: Finding | null, req: Requirements) {
  if (!resultAssetId || !finding) return null;
  const obs = await latestObservation(checkId, resultAssetId);
  if (!obs) return null;
  return recheckOutcome(finding, assess(req, obs.json, {}, previewableCategories()));
}

export { RECHECK_LABEL } from "./rules";

/** Headline, explanation and recommendation for each outcome, shared by the decision page and the card. */
export function outcomeText(d: Pick<DecisionData, "decision" | "result" | "keyFinding" | "recheck">) {
  const r = d.result;
  if (d.decision === "change") {
    const kf = d.keyFinding;
    return {
      title: d.recheck?.state === "appears_resolved" ? "Make this one change." : "Consider this change — unresolved",
      lede: d.recheck?.state === "appears_resolved"
        ? "You chose the previewed change, and an AI re-reading of the preview found the requirement met. Look at it yourself before you commit."
        : "You chose the previewed change. It hasn't been shown to meet the requirement, so check the preview before you commit.",
      recommendation: kf ? `${kf.observation} ${kf.reason}` : "Use the previewed change.",
    };
  }
  const notChecked = (r.checks ?? []).filter((c) => c.result === "not_checked").map((c) => `“${c.label}”`);
  if (r.status === "compatible") return { title: "Keep your outfit.", lede: "The requirements you confirmed were checked and nothing conflicts.", recommendation: "No change needed." };
  if (r.status === "no_requirements") return { title: "Saved without a check.", lede: "No requirements were given, so WearCheck didn't assess this outfit.", recommendation: "Nothing was checked. Add the event's requirements to get an assessment." };
  if (r.status === "insufficient") return { title: "Kept — not fully checked.", lede: "Some requirements couldn't be checked from this photo.", recommendation: `You kept this outfit.${notChecked.length ? ` Not checked: ${notChecked.join(", ")}.` : ""}` };
  return { title: "Keep your outfit.", lede: "You chose to keep what you have. The findings are summarised below.", recommendation: `You chose to keep this outfit.${d.keyFinding ? ` Noted: ${d.keyFinding.observation}` : ""}` };
}

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
  const keyFinding = (job ? result.findings.find((f) => f.id === job.finding_id) : result.findings.find((f) => f.id === result.key_finding_id)) ?? null;
  const [card] = await db()`select created_at from wearcheck.decision_cards where check_id = ${check.id} order by created_at desc limit 1`;
  const recheck = job ? await previewRecheck(check.id, job.result_asset_id, keyFinding, reqs.json) : null;
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
    recheck,
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
    return `Generation alone doesn't verify the requirement. If any ${rule.colours.map((c) => COLOUR_LABEL[c]).join(" or ")} clothing is still visible in the preview — a layer underneath, cuffs, a collar — it hasn't resolved ${quote}.`;
  }
  if (rule && (rule.type === "footwear_preference" || rule.type === "footwear_requirement")) {
    return `Generation alone doesn't verify the requirement. Look at the shoes in the preview and judge whether they meet ${quote}; it shows appearance, not grip or comfort on the ground.`;
  }
  if (quote) return `Generation alone doesn't verify ${quote}. Judge for yourself whether the preview meets it.`;
  if (finding.kind === "practical") return "Generation shows appearance only, not how the shoes behave on the ground.";
  return null;
}
