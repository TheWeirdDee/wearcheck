import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OutfitStep } from "@/components/workflow/outfit-step";
import { photoAsset, requireOwnedCheck } from "@/lib/checks";

export const metadata: Metadata = { title: "Your outfit" };

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  if (check.requirements_revision === 0) redirect(`/check/${check.id}/requirements`);
  const photo = await photoAsset(check);
  return <OutfitStep checkId={check.id} existing={photo ? { url: `/api/media/${photo.id}`, width: photo.width, height: photo.height } : null} />;
}
