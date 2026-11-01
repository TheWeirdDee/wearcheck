"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client";
import { COLOUR_FAMILIES, COLOUR_LABEL, FOOTWEAR_LABEL, FOOTWEAR_STYLES, type AssessmentResult, type ColourFamily, type Finding, type FootwearStyle, type UserCorrections } from "@/lib/schemas";
import { CheckIcon, ChevronIcon } from "../icons";

const BADGE: Record<AssessmentResult["status"], { cls: string }> = {
  compatible: { cls: "bg-ok" },
  consider_change: { cls: "bg-warn" },
  conflict: { cls: "bg-bad" },
  insufficient: { cls: "bg-line-strong" },
};
const ROW_LABEL = { no_issue: "No clear issue", needs_look: "Needs a look", conflict: "Conflicts with a stated rule", cant_assess: "Can't assess" } as const;
const KIND_LABEL: Record<Finding["kind"], string> = {
  explicit_rule: "Event rule",
  explicit_preference: "Event recommendation",
  practical: "Practical consideration",
  style_suggestion: "Styling suggestion",
  visibility: "Photo visibility",
};
const SOURCE_LABEL: Record<Finding["evidence_source"], string> = {
  invitation: "From invitation", user: "Entered by you", suggested: "Suggestion you confirmed", photo_model: "AI observation from your photo", user_correction: "Confirmed by you",
};

type Props = {
  checkId: string;
  photoUrl: string;
  photoAssetId: string;
  requirementsRevision: number;
  eventLabel: string;
  initial: { assessmentId: string; result: AssessmentResult } | null;
  corrections: UserCorrections;
  hadOlderPreviews: boolean;
};

const STAGES = ["Reading outfit details", "Comparing against confirmed requirements", "Preparing your assessment"];

export function AssessmentView(p: Props) {
  const router = useRouter();
  const [data, setData] = useState(p.initial);
  const [stage, setStage] = useState<number>(p.initial ? 3 : 0);
  const [error, setError] = useState<{ message: string; action: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [corr, setCorr] = useState<UserCorrections>(p.corrections);
  const started = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const run = useCallback(async (opts: { corrections?: UserCorrections; reobserve?: boolean } = {}) => {
    setError(null);
    try {
      if (!opts.corrections) {
        setStage(0);
        await api(`/api/checks/${p.checkId}/observe`, { method: "POST", body: JSON.stringify({ photoAssetId: p.photoAssetId, force: Boolean(opts.reobserve) }) });
      }
      setStage(1);
      const r = await api<{ assessmentId: string; result: AssessmentResult }>(`/api/checks/${p.checkId}/assessment`, {
        method: "POST",
        body: JSON.stringify({ requirementsRevision: p.requirementsRevision, photoAssetId: p.photoAssetId, corrections: opts.corrections }),
      });
      setStage(2);
      setData(r);
      setStage(3);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (e) {
      const b = e instanceof ClientApiError ? e.body : { message: "Something went wrong.", action: "RETRY" };
      if (b.action === "RETRY" && e instanceof ClientApiError && e.status === 409) router.refresh();
      setError({ message: b.message, action: b.action });
    }
  }, [p.checkId, p.photoAssetId, p.requirementsRevision, router]);

  useEffect(() => {
    if (!p.initial && !started.current) {
      started.current = true;
      void run();
    }
  }, [p.initial, run]);

  async function decideKeep() {
    setBusy(true);
    try {
      const r = await api<{ nextPath: string }>(`/api/checks/${p.checkId}/decision`, { method: "POST", body: JSON.stringify({ decision: "keep" }) });
      router.push(r.nextPath);
    } catch (e) {
      setError({ message: e instanceof ClientApiError ? e.body.message : "Couldn't save.", action: "RETRY" });
      setBusy(false);
    }
  }

  async function answer(c: UserCorrections) {
    setBusy(true);
    await run({ corrections: c });
    setBusy(false);
    setShowCorrect(false);
  }

  // ---------- running / error ----------
  if (!data) {
    return (
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-12">
        <div>
          <p className="eyebrow plain">Step 3 · {p.eventLabel}</p>
          <h1 className="t-2 mt-3">Checking your outfit</h1>
          <p className="lede mt-4 max-w-[40ch]">Reading what&rsquo;s visible in your photo, then comparing it with the requirements you confirmed.</p>
          <ol className="mt-8 divide-y divide-line border-y border-line" aria-live="polite">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-4 py-4 text-[1.02rem] ${i <= stage ? "text-ink" : "text-muted"}`}>
                <span className={`inline-flex size-7 flex-none items-center justify-center border ${i < stage ? "border-ink bg-ink text-bg" : i === stage && !error ? "border-ink" : "border-line"}`}>
                  {i < stage ? <CheckIcon /> : i === stage && !error ? <span className="size-2 animate-pulse bg-ink" /> : null}
                </span>
                {s}
              </li>
            ))}
          </ol>
          {error ? (
            <div role="alert" className="mt-8 border-l-2 border-bad bg-raised p-4">
              <p className="font-medium">{error.message}</p>
              <div className="mt-3 flex flex-wrap gap-4">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => run()}>Try again</button>
                <Link href={`/check/${p.checkId}/requirements`} className="btn btn-quiet text-[0.95rem]">Edit requirements</Link>
                <Link href={`/check/${p.checkId}/outfit`} className="btn btn-quiet text-[0.95rem]">Change photo</Link>
              </div>
            </div>
          ) : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="relative overflow-hidden bg-photo"><img src={`${p.photoUrl}?size=thumb`} alt="Your outfit photo" className="max-h-[60vh] w-full object-contain" />{!error ? <span aria-hidden className="wc-scan absolute inset-0" /> : null}</div>
      </div>
    );
  }

  // ---------- result ----------
  const res = data.result;
  const key = res.findings.find((f) => f.id === res.key_finding_id) ?? null;
  const secondary = res.findings.filter((f) => f.id !== key?.id && f.status !== "ok").slice(0, 4);
  const canPreview = Boolean(res.primary_action);
  // Other findings that can also be previewed (e.g. the shoes, when the key finding is a garment).
  const alsoPreviewable = res.status === "insufficient" ? [] : res.findings.filter((f) => f.id !== key?.id && (f.status === "conflict" || f.status === "consider_change") && f.render_category && (f.user_action === "preview_shoes" || f.user_action === "preview_garment"));
  const compatible = res.status === "compatible";

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <figure className="order-2 lg:sticky lg:top-28 lg:order-1 lg:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl} alt="Your original outfit photo" className="aspect-[4/5] max-h-[76vh] w-full bg-photo object-contain" />
          <figcaption className="photo-credit mt-3">Your original photo</figcaption>
        </figure>
        <div className="order-1 lg:order-2">
          <p className="eyebrow plain">Step 3 · {p.eventLabel}</p>
          <p className="mt-4 inline-flex items-center gap-2.5 bg-raised px-3 py-2 text-[0.95rem] font-semibold"><span aria-hidden className={`size-2.5 rounded-full ${BADGE[res.status].cls}`} />{res.headline}</p>
          <h1 ref={headingRef} tabIndex={-1} className="t-2 mt-5 outline-none">
            {key ? key.observation : compatible ? "Nothing in your confirmed requirements conflicts with this outfit." : "We need a bit more information."}
          </h1>
          {key ? <p className="lede mt-4">{key.reason}</p> : null}
          {compatible ? <p className="mt-3 text-ink-2">This isn&rsquo;t approval from your host — it means we found no conflict with what you confirmed.</p> : null}

          {key ? (
            <div className="mt-4">
              <button type="button" className="inline-flex min-h-11 items-center gap-1 text-[0.95rem] font-semibold underline underline-offset-4" aria-expanded={why} onClick={() => setWhy((w) => !w)}>
                Why? <ChevronIcon className={`size-4 transition ${why ? "rotate-180" : ""}`} />
              </button>
              {why ? (
                <dl className="mt-2 space-y-2 border-l-2 border-ink pl-4 text-[0.95rem]">
                  <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{KIND_LABEL[key.kind]}</dd></div>
                  <div><dt className="inline font-semibold">Source: </dt><dd className="inline">{SOURCE_LABEL[key.evidence_source]}</dd></div>
                  {key.evidence_text ? <div><dt className="inline font-semibold">Exact text: </dt><dd className="inline italic">“{key.evidence_text}”</dd></div> : null}
                  {key.uncertainty ? <div><dt className="inline font-semibold">Uncertainty: </dt><dd className="inline">{key.uncertainty}</dd></div> : null}
                </dl>
              ) : null}
            </div>
          ) : null}

          {res.clarification ? (
            <fieldset className="mt-8 bg-accent-soft p-5" disabled={busy}>
              <legend className="float-left mb-2 w-full text-[0.875rem] font-semibold uppercase tracking-[0.06em] text-accent">One question first</legend>
              <p className="clear-both font-display text-xl font-semibold leading-snug">{res.clarification.question}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {res.clarification.options.map((o) => (
                  <button key={o.value} type="button" className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const id = res.clarification!.id;
                      if (id === "main_garment_colour") answer({ main_garment_colour: o.value as ColourFamily });
                      else if (id === "footwear_style") answer({ footwear_style: o.value as FootwearStyle });
                      else if (id.startsWith("colour:")) answer({ garment_colours: { [id.slice(7)]: o.value as ColourFamily } });
                      else answer({ rule_answers: { [id.slice(5)]: o.value as "applies" | "does_not_apply" } });
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
              {busy ? <p role="status" className="mt-3 text-[0.95rem] text-ink-2">Updating your assessment…</p> : null}
            </fieldset>
          ) : null}

          {error ? <p role="alert" className="mt-4 border-l-2 border-bad pl-3 font-medium">{error.message}</p> : null}

          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:flex-wrap">
            {canPreview ? (
              <>
                <Link href={`/check/${p.checkId}/options`} className="btn btn-primary">Preview the smallest change</Link>
                <button type="button" className="btn btn-secondary" onClick={decideKeep} disabled={busy}>Keep this outfit</button>
              </>
            ) : compatible ? (
              <>
                <button type="button" className="btn btn-primary" onClick={decideKeep} disabled={busy}>Save my outfit check</button>
                <Link href={`/check/${p.checkId}/options?explore=1`} className="btn btn-quiet">Explore alternatives (optional)</Link>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={decideKeep} disabled={busy || Boolean(res.clarification)}>Keep this outfit</button>
            )}
          </div>
          {alsoPreviewable.length ? (
            <div className="mt-6 bg-raised p-4" aria-labelledby="h-also">
              <p id="h-also" className="text-[0.875rem] font-semibold uppercase tracking-[0.06em] text-ink-2">Also worth a look</p>
              <ul className="mt-2 space-y-3">
                {alsoPreviewable.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0 flex-1"><span className="font-medium">{f.observation}</span> <span className="text-ink-2">{f.reason}</span></span>
                    <Link href={`/check/${p.checkId}/options?finding=${f.id}`} className="btn btn-secondary btn-sm">Preview this change</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            <button type="button" className="btn btn-quiet text-[0.95rem]" aria-expanded={showCorrect} onClick={() => setShowCorrect((s) => !s)}>Correct my outfit details</button>
            <Link href={`/check/${p.checkId}/requirements`} className="btn btn-quiet text-[0.95rem]">Edit event</Link>
            {key?.user_action === "retake_photo" || !res.shoes_assessable ? <Link href={`/check/${p.checkId}/outfit`} className="btn btn-quiet text-[0.95rem]">Use a different photo</Link> : null}
          </div>

          {showCorrect ? (
            <form className="mt-4 grid gap-4 bg-raised p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); answer(corr); }}>
              <label className="block"><span className="label">Main garment colour</span>
                <select className="field" value={corr.main_garment_colour ?? ""} onChange={(e) => setCorr({ ...corr, main_garment_colour: (e.target.value || undefined) as ColourFamily | undefined })}>
                  <option value="">Use what the photo shows</option>
                  {COLOUR_FAMILIES.map((c) => <option key={c} value={c}>{COLOUR_LABEL[c]}</option>)}
                </select>
              </label>
              <label className="block"><span className="label">Shoe style</span>
                <select className="field" value={corr.footwear_style ?? ""} onChange={(e) => setCorr({ ...corr, footwear_style: (e.target.value || undefined) as FootwearStyle | undefined })}>
                  <option value="">Use what the photo shows</option>
                  {FOOTWEAR_STYLES.map((s) => <option key={s} value={s}>{FOOTWEAR_LABEL[s]}</option>)}
                </select>
              </label>
              <div className="sm:col-span-2"><button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>Update assessment</button></div>
            </form>
          ) : null}

          {p.hadOlderPreviews ? <p className="mt-6 text-[0.95rem] text-muted">Earlier previews were made for a previous version of your requirements or photo and are kept separately.</p> : null}
        </div>
      </div>

      {/* Breakdown */}
      <section className="mt-16 max-w-[52rem]" aria-labelledby="h-breakdown">
        <h2 id="h-breakdown" className="t-3">Breakdown</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {(["clothing", "colour", "shoes_venue"] as const).map((area) => {
            const row = res.rows[area];
            const items = res.findings.filter((f) => f.area === area);
            return (
              <details key={area} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-lg font-semibold">{area === "clothing" ? "Clothing" : area === "colour" ? "Colour & restrictions" : "Shoes & venue"}</span>
                  <span className="flex items-center gap-2 text-[0.95rem] text-ink-2">{ROW_LABEL[row.status]} <ChevronIcon className="size-4 transition group-open:rotate-180" /></span>
                </summary>
                <div className="mt-4 space-y-4 text-[0.975rem]">
                  {items.length === 0 ? <p className="text-ink-2">{row.summary}</p> : items.map((f) => (
                    <div key={f.id} className="border-l-2 border-line-strong pl-3">
                      <p className="font-medium">{f.observation}</p>
                      <p className="mt-1 text-ink-2">{f.reason}</p>
                      <p className="mt-1 text-[0.875rem] text-muted">{KIND_LABEL[f.kind]} · {SOURCE_LABEL[f.evidence_source]}{f.uncertainty ? ` · ${f.uncertainty}` : ""}</p>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
        {secondary.length ? <p className="mt-3 text-[0.95rem] text-muted">{secondary.length} other observation{secondary.length === 1 ? "" : "s"} listed above.</p> : null}
        <p className="mt-6 text-[0.9rem] text-muted">We can&rsquo;t judge fabric quality, fit, comfort or heel stability from a photo.</p>
        <button type="button" className="btn btn-quiet mt-2 text-sm" onClick={() => { setData(null); started.current = true; void run({ reobserve: true }); }}>Re-read the photo</button>
      </section>
    </div>
  );
}
