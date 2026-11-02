import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssessmentView } from "@/components/workflow/assessment-view";
import { currentAssessment, currentRequirements, latestObservation, photoAsset, requireOwnedCheck } from "@/lib/checks";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const reqs = await currentRequirements(check);
  if (!reqs) redirect(`/check/${check.id}/requirements`);
  const photo = await photoAsset(check);
  if (!photo) redirect(`/check/${check.id}/outfit`);
  const [assessment, obs] = await Promise.all([currentAssessment(check), latestObservation(check.id, photo.id, check.requirements_revision)]);
  const [{ older }] = await db()`select count(*)::int as older from wearcheck.render_jobs where check_id = ${check.id} and assessment_id <> ${assessment?.id ?? "00000000-0000-0000-0000-000000000000"}`;
  const r = reqs.json;
  return (
    <AssessmentView
      key={`${reqs.revision}:${photo.id}`}
      checkId={check.id}
      photoUrl={`/api/media/${photo.id}`}
      photoAssetId={photo.id}
      requirementsRevision={reqs.revision}
      eventLabel={r.event_name ?? (r.event_type ? `${r.event_type[0].toUpperCase()}${r.event_type.slice(1)}` : "Your occasion")}
      initial={assessment ? { assessmentId: assessment.id, result: assessment.findings_json } : null}
      corrections={obs?.user_corrections ?? {}}
      hadOlderPreviews={older > 0}
    />
  );
}
