import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon } from "@/components/icons";
import { StartCheckButton } from "@/components/start-check-button";
import { requireOwnedCheck } from "@/lib/checks";
import { CARD_DISCLAIMER, dressCodeSource, loadDecision, SOURCE_LABEL } from "@/lib/decision";

export const metadata: Metadata = { title: "Your outfit decision" };

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const d = await loadDecision(check);
  if (!d) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold">No decision yet</h1>
        <p className="mt-3 text-ink-2">Your requirements or photo may have changed since you decided. Review the latest assessment to finish.</p>
        <Link href={`/check/${check.id}/assessment`} className="btn btn-primary mt-6">Go to assessment</Link>
      </div>
    );
  }
  const keep = d.decision === "keep";
  const r = d.requirements;
  const kf = d.keyFinding;
  const original = `/api/media/${d.photoAssetId}`;
  const preview = d.job?.result_asset_id ? `/api/media/${d.job.result_asset_id}` : null;
  const cardUrl = `/api/checks/${check.id}/decision-card`;

  return (
    <div>
      <p className="eyebrow">{r.event_name ?? "Your occasion"}{r.event_date ? ` · ${r.event_date}` : ""}</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Your outfit decision</h1>
      <p className="mt-3 font-display text-2xl font-semibold">{keep ? "Keep what you have" : "Consider this one change"}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview ?? original} alt={preview ? "AI-generated preview of the chosen change" : "Your original outfit photo"} className="max-h-[75vh] w-full border border-line bg-raised object-contain" />
            {preview ? <span className="ai-label absolute left-2 top-2">AI preview</span> : <span className="absolute left-2 top-2 bg-bg px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em]">Original</span>}
          </figure>
          {preview ? (
            <figure className="w-20 sm:w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${original}?size=thumb`} alt="Original outfit photo" className="w-full border border-line object-contain" />
              <figcaption className="mt-1 text-xs text-muted">Original</figcaption>
            </figure>
          ) : null}
        </div>

        <div>
          <dl className="divide-y divide-line border-y border-line text-sm">
            <div className="py-3"><dt className="text-muted">Status</dt><dd className="mt-1 font-semibold">{d.result.headline}</dd></div>
            <div className="py-3"><dt className="text-muted">Recommendation</dt><dd className="mt-1 text-base">{keep ? (d.result.status === "compatible" ? "No change needed." : "You chose to keep your outfit.") : kf ? kf.observation : "Use the previewed change."}{kf && !keep ? ` ${kf.reason}` : ""}</dd></div>
            {kf ? <div className="py-3"><dt className="text-muted">Evidence</dt><dd className="mt-1">{kf.evidence_text ? `“${kf.evidence_text}” — ` : ""}{SOURCE_LABEL[kf.evidence_source]}</dd></div> : null}
            <div className="py-3"><dt className="text-muted">Dress code source</dt><dd className="mt-1">{dressCodeSource(r)}</dd></div>
            {d.item ? (
              <div className="py-3"><dt className="text-muted">Reference item</dt><dd className="mt-1">{d.item.title}<span className="block text-xs text-muted">{d.item.creator}, {d.item.licence} · Visual reference — not a live shopping listing.</span></dd></div>
            ) : d.userRefAssetId ? <div className="py-3"><dt className="text-muted">Reference item</dt><dd className="mt-1">Provided by you</dd></div> : null}
          </dl>
          <p className="mt-4 text-xs text-muted">{CARD_DISCLAIMER}</p>

          <div className="mt-6 flex flex-col gap-3">
            <a href={`${cardUrl}?download=1`} className="btn btn-primary"><DownloadIcon /> Download decision card</a>
            {preview ? <a href={`${preview}?download=1`} className="btn btn-secondary"><DownloadIcon /> Download preview</a> : null}
            <StartCheckButton className="btn btn-secondary w-full">Start another check</StartCheckButton>
            <Link href={`/check/${check.id}/assessment`} className="btn btn-quiet">Back to assessment</Link>
          </div>
        </div>
      </div>

      <section className="mt-14" aria-labelledby="h-card">
        <h2 id="h-card" className="text-xl font-semibold">Decision card</h2>
        <p className="mt-1 text-sm text-muted">A PNG you can save or send. It contains your photo{preview ? " and the AI preview" : ""}, so share it only with people you trust.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cardUrl} alt="Outfit decision card summarising the event, verdict, reason and images" className="mt-4 w-full max-w-md border border-line" />
      </section>
    </div>
  );
}
