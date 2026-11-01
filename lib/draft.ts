import "server-only";
import { type CheckRow, currentRequirements, latestEventSource } from "./checks";
import { fromExtraction, fromManual } from "./requirements";
import { InvitationExtraction, ManualDetails, type Requirements } from "./schemas";

export type Draft = {
  requirements: Requirements;
  confirmed: boolean;
  revision: number;
  sourceAssetId: string | null;
  sourceType: string;
  modelId: string | null;
};

/** The requirements the user sees on the review step: the confirmed revision, or a fresh draft. */
export async function loadDraft(check: CheckRow): Promise<Draft | null> {
  const src = await latestEventSource(check.id);
  const confirmed = await currentRequirements(check);
  // A newer event source than the confirmed revision means the user re-entered details: show the new draft.
  if (confirmed && (!src || new Date(confirmed.confirmed_at) >= new Date((src as unknown as { created_at: Date }).created_at))) {
    return { requirements: confirmed.json, confirmed: true, revision: confirmed.revision, sourceAssetId: src?.asset_id ?? null, sourceType: confirmed.json.origin, modelId: confirmed.model_id };
  }
  if (!src) return null;
  if (src.source_type === "invitation_image") {
    if (src.extraction_status !== "done" || !src.extraction_json) return null;
    const x = InvitationExtraction.safeParse(src.extraction_json);
    if (!x.success) return null;
    return { requirements: fromExtraction(x.data), confirmed: false, revision: check.requirements_revision, sourceAssetId: src.asset_id, sourceType: "invitation_image", modelId: src.model_id };
  }
  const m = ManualDetails.safeParse(src.manual_json);
  if (!m.success) return null;
  return {
    requirements: fromManual(m.data, src.source_type === "demo_manual" ? "demo_manual" : "manual"),
    confirmed: false, revision: check.requirements_revision, sourceAssetId: null, sourceType: src.source_type, modelId: null,
  };
}
