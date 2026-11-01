import type { Metadata } from "next";
import { InvitationStep } from "@/components/workflow/invitation-step";
import { latestEventSource, requireOwnedCheck } from "@/lib/checks";
import { ManualDetails } from "@/lib/schemas";

export const metadata: Metadata = { title: "The occasion" };

export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const src = await latestEventSource(check.id);
  const manual = src && src.source_type !== "invitation_image" ? ManualDetails.safeParse(src.manual_json) : null;
  return (
    <InvitationStep
      checkId={check.id}
      initialManual={manual?.success ? { ...manual.data, event_type: manual.data.event_type ?? "" } : null}
    />
  );
}
