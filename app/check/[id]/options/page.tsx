import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OptionsView, type OptionItem } from "@/components/workflow/options-view";
import { optionsFor, voluntaryOptions, type CatalogueItem } from "@/lib/catalogue";
import { currentAssessment, currentRequirements, photoAsset, requireOwnedCheck } from "@/lib/checks";
import type { RenderCategory } from "@/lib/schemas";

export const metadata: Metadata = { title: "Choose a change" };

const toItem = (c: CatalogueItem): OptionItem => ({
  id: c.id, title: c.title, category: c.category, file: c.file, tags: c.tags, creator: c.creator,
  licence: c.licence, licence_url: c.licence_url, source_name: c.source_name, source_url: c.source_url,
});

const HEADINGS: Record<RenderCategory, string> = {
  shoes: "Let's fix the shoes — not the whole outfit",
  full_body: "Let's try one different dress — and keep your shoes",
  upper_body: "Let's change the top — not the whole outfit",
  outer: "Let's add a different outer layer",
};

export default async function OptionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ explore?: string; finding?: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const sp = await searchParams;
  const explore = sp.explore === "1";
  const [reqs, assessment, photo] = await Promise.all([currentRequirements(check), currentAssessment(check), photoAsset(check)]);
  if (!reqs || !photo) redirect(`/check/${check.id}/requirements`);
  if (!assessment) redirect(`/check/${check.id}/assessment`);
  const res = assessment.findings_json;
  // A specific actionable finding (from "Also worth a look"), else the assessment's primary action.
  const chosen = sp.finding ? res.findings.find((f) => f.id === sp.finding && f.render_category && (f.user_action === "preview_shoes" || f.user_action === "preview_garment") && (f.status === "conflict" || f.status === "consider_change")) : null;
  const key = (res.status !== "insufficient" ? chosen : null) ?? res.findings.find((f) => f.id === res.primary_action?.finding_id) ?? null;

  if (!explore && !key) {
    return (
      <div className="max-w-2xl">
        <h1 className="t-2">No change to preview</h1>
        <p className="mt-3 text-ink-2">{res.clarification ? "Please answer the open question on your assessment first." : "Your assessment didn't identify a change we can preview from this photo."}</p>
        <Link href={`/check/${check.id}/assessment`} className="btn btn-primary mt-6">Back to assessment</Link>
      </div>
    );
  }

  if (explore || !key) {
    // Optional alternatives for a compatible outfit: any supported category, filtered by the user's rules.
    const allowed = (["full_body", "upper_body", "outer", "shoes"] as RenderCategory[]).filter((c) => c !== "shoes" || res.shoes_assessable);
    const items = voluntaryOptions(reqs.json, allowed);
    return (
      <OptionsView
        checkId={check.id} findingId="voluntary" explore heading="Optional: try an alternative"
        reason="Your outfit already looks compatible. This is entirely optional — keeping what you have is a complete result."
        photoUrl={`/api/media/${photo.id}`} items={items.map(toItem)} allowedCategories={allowed} shoesAssessable={res.shoes_assessable}
      />
    );
  }

  const cat = key.render_category!;
  return (
    <OptionsView
      checkId={check.id}
      findingId={key.id}
      explore={false}
      heading={HEADINGS[cat]}
      reason={key.reason}
      photoUrl={`/api/media/${photo.id}`}
      items={optionsFor(key, reqs.json).map(toItem)}
      allowedCategories={[cat]}
      shoesAssessable={res.shoes_assessable}
    />
  );
}
