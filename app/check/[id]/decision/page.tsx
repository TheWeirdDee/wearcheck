import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon } from "@/components/icons";
import { StartCheckButton } from "@/components/start-check-button";
import { requireOwnedCheck } from "@/lib/checks";
import { CARD_DISCLAIMER, dressCodeSource, loadDecision, outcomeText, RECHECK_LABEL, SOURCE_LABEL, unresolvedNote } from "@/lib/decision";

export const metadata: Metadata = { title: "Your outfit decision" };

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await requireOwnedCheck((await params).id);
  const d = await loadDecision(check);
  if (!d) {
    return (
      <div className="max-w-2xl">
        <h1 className="t-2">No decision yet</h1>
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
  const text = outcomeText(d);

  return (
    <div>
      <p className="eyebrow plain">Decision · {r.event_name ?? "Your occasion"}{r.event_date ? ` · ${r.event_date}` : ""}</p>
      <h1 className="t-1 mt-4">{text.title}</h1>
      <p className="lede mt-4 max-w-[48ch]">{text.lede}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <div className={`grid items-start gap-3 ${preview ? "grid-cols-2" : "grid-cols-1"}`}>
          {preview ? (
            <figure className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={original} alt="Your original outfit photo" className="aspect-[4/5] max-h-[calc(100svh-12rem)] w-full bg-photo object-contain" />
              <figcaption className="absolute left-2 top-2 bg-bg px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.08em]">Original</figcaption>
            </figure>
          ) : null}
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview ?? original} alt={preview ? "AI-generated preview of the chosen change" : "Your original outfit photo"} className="aspect-[4/5] max-h-[calc(100svh-12rem)] w-full bg-photo object-contain" />
            {preview ? <span className="ai-label absolute right-2 top-2">AI preview</span> : <span className="absolute left-3 top-3 bg-bg px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.08em]">Original</span>}
          </figure>
        </div>

        <div>
          <dl className="divide-y divide-line border-y border-line text-[0.975rem]">
            <div className="py-4"><dt className="text-[0.875rem] text-muted">Status</dt><dd className="mt-1 font-display text-lg font-semibold">{d.result.headline}</dd></div>
            <div className="py-4"><dt className="text-[0.875rem] text-muted">Recommendation</dt><dd className="mt-1 text-base">{text.recommendation}</dd></div>
            {!keep ? <div className="py-4"><dt className="text-[0.875rem] text-muted">Does the preview meet it?</dt><dd className="mt-1 font-semibold">{RECHECK_LABEL[d.recheck?.state ?? "none"]}</dd>{d.recheck ? <dd className="mt-1 text-[0.95rem] text-ink-2">{d.recheck.note}</dd> : null}</div> : null}
            {kf ? <div className="py-4"><dt className="text-[0.875rem] text-muted">Evidence</dt><dd className="mt-1">{kf.evidence_text ? `“${kf.evidence_text}” — ` : ""}{SOURCE_LABEL[kf.evidence_source]}</dd></div> : null}
            <div className="py-4"><dt className="text-[0.875rem] text-muted">Dress code source</dt><dd className="mt-1">{dressCodeSource(r)}</dd></div>
            {d.item ? (
              <div className="py-4"><dt className="text-[0.875rem] text-muted">Reference item</dt><dd className="mt-1">{d.item.title}<span className="block text-[0.8125rem] text-muted">{d.item.creator}, {d.item.licence} · Visual reference — not a live shopping listing.</span></dd></div>
            ) : d.userRefAssetId ? <div className="py-4"><dt className="text-[0.875rem] text-muted">Reference item</dt><dd className="mt-1">Provided by you</dd></div> : null}
          </dl>
          {!keep && d.recheck?.checks?.length ? <section className="mt-6" aria-label="Chosen preview requirements"><h2 className="font-semibold">Whole preview recheck</h2><ul className="mt-3 space-y-3">{d.recheck.checks.map((c, i) => <li key={i}><strong>{c.label}: {c.result === "ok" ? "appears met" : c.result === "issue" ? "remaining issue" : "not checked"}</strong><p className="text-sm text-ink-2">{c.note}</p></li>)}</ul></section> : null}
          {!keep && kf && d.recheck?.state !== "appears_resolved" && unresolvedNote(kf, r) ? <p className="mt-4 border-l-2 border-warn pl-3 text-[0.95rem]">{unresolvedNote(kf, r)}</p> : null}
          <p className="mt-4 text-[0.9rem] text-muted">{CARD_DISCLAIMER}</p>

          <div className="mt-8 flex flex-col gap-3">
            <a href={`${cardUrl}?download=1`} className="btn btn-primary"><DownloadIcon /> Download decision card</a>
            {preview ? <a href={`${preview}?download=1`} className="btn btn-secondary"><DownloadIcon /> Download preview</a> : null}
            <StartCheckButton className="btn btn-secondary w-full">Start another check</StartCheckButton>
            <Link href={`/check/${check.id}/assessment`} className="btn btn-quiet">Back to assessment</Link>
          </div>
        </div>
      </div>

      <section className="mt-16 grid gap-8 border-t border-line pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]" aria-labelledby="h-card">
        <div>
          <h2 id="h-card" className="t-3">Your decision card</h2>
          <p className="mt-3 text-ink-2">A PNG you can save or send. It contains your photo{preview ? " and the AI preview" : ""}, so share it only with people you trust.</p>
          <a href={`${cardUrl}?download=1`} className="btn btn-secondary mt-6"><DownloadIcon /> Download card</a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cardUrl} alt="Outfit decision card summarising the event, verdict, reason and images" className="w-full max-w-md bg-raised shadow-[0_30px_60px_-40px_rgba(0,0,0,0.5)]" />
      </section>
    </div>
  );
}
