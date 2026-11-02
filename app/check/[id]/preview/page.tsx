import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PreviewRunner } from "@/components/workflow/preview-runner";
import { catalogueItem } from "@/lib/catalogue";
import { currentAssessment, currentRequirements, isUuid, photoAsset, requireOwnedCheck } from "@/lib/checks";
import { db } from "@/lib/db";
import { previewRecheck, unresolvedNote } from "@/lib/decision";
import type { RenderCategory } from "@/lib/schemas";
import { jobsForCheck, publicJob, type JobRow } from "@/lib/jobs";

export const metadata: Metadata = { title: "Preview" };

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ job?: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const wanted = (await searchParams).job;
  const jobs = await jobsForCheck(check.id);
  const job: JobRow | undefined = wanted && isUuid(wanted) ? jobs.find((j) => j.id === wanted) : jobs[0];
  if (!job) {
    return (
      <div className="max-w-2xl">
        <h1 className="t-2">No preview yet</h1>
        <p className="mt-3 text-ink-2">Choose an item to preview first.</p>
        <Link href={`/check/${check.id}/options`} className="btn btn-primary mt-6">Choose an item</Link>
      </div>
    );
  }
  const [assessment, photo] = await Promise.all([currentAssessment(check), photoAsset(check)]);
  if (!photo) redirect(`/check/${check.id}/outfit`);
  const [src] = await db()`select id from wearcheck.media_assets where id = ${job.source_asset_id} and check_id = ${check.id}`;
  const it = job.catalogue_item_id ? catalogueItem(job.catalogue_item_id) : null;
  const finding = assessment?.findings_json.findings.find((f) => f.id === job.finding_id);
  const reqs = await currentRequirements(check);
  const current = Boolean(assessment && job.assessment_id === assessment.id);
  const initialRecheck = current && reqs ? await previewRecheck(check.id, job.result_asset_id, finding ?? null, reqs.json, reqs.revision) : null;
  // If a garment change leaves the problem, offer the other garment operations this photo supports.
  const supports = assessment?.findings_json.photo_supports;
  const thisCat = (job.feature === "shoes-transfer" ? "shoes" : job.garment_category) as RenderCategory;
  const ALT_LABEL: Record<RenderCategory, string> = { upper_body: "Try a different top", outer: "Try an outer layer over it", full_body: "Try a full outfit instead", shoes: "Try different shoes" };
  const alternatives = finding && thisCat !== "shoes" && supports
    ? (["outer", "full_body", "upper_body"] as RenderCategory[]).filter((c) => c !== thisCat && supports[c]?.ok).map((c) => ({ href: `/check/${check.id}/options?finding=${finding.id}&category=${c}`, label: ALT_LABEL[c] }))
    : [];
  return (
    <PreviewRunner
      key={job.id}
      checkId={check.id}
      initialJob={publicJob(job, assessment?.id ?? null)}
      originalUrl={`/api/media/${src?.id ?? photo.id}`}
      item={{
        title: it?.title ?? "Your item (provided by you)",
        file: it?.file ?? null,
        userUrl: job.user_ref_asset_id ? `/api/media/${job.user_ref_asset_id}` : null,
        credit: it ? `Reference image: ${it.creator}, ${it.licence}. Visual reference — not a live shopping listing.` : "Provided by you.",
        reason: finding ? finding.reason : "An optional alternative you chose to try.",
      }}
      unresolvedNote={finding && reqs ? unresolvedNote(finding, reqs.json) : null}
      recheck={{ available: current, initial: initialRecheck }}
      alternatives={alternatives}
    />
  );
}
