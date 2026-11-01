import type { Metadata } from "next";
import Link from "next/link";
import { RequirementsEditor } from "@/components/workflow/requirements-editor";
import { latestEventSource, requireOwnedCheck } from "@/lib/checks";
import { loadDraft } from "@/lib/draft";

export const metadata: Metadata = { title: "Confirm requirements" };

export default async function RequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const draft = await loadDraft(check);
  if (!draft) {
    const src = await latestEventSource(check.id);
    return (
      <div className="max-w-2xl">
        <h1 className="t-2">{src?.extraction_status === "failed" ? "We couldn't read that invitation" : "Add the event first"}</h1>
        <p className="mt-3 text-ink-2">{src?.extraction_status === "failed" ? "You can try another image, or enter the details yourself." : "Tell us about the occasion so we have something to check against."}</p>
        <Link href={`/check/${check.id}/invitation`} className="btn btn-primary mt-6">Go to event details</Link>
      </div>
    );
  }
  return (
    <RequirementsEditor
      checkId={check.id}
      initial={draft.requirements}
      revision={check.requirements_revision}
      confirmed={draft.confirmed}
      invitationUrl={draft.sourceAssetId ? `/api/media/${draft.sourceAssetId}` : null}
      isDemo={draft.requirements.origin === "demo_manual"}
    />
  );
}
