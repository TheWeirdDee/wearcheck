"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client";
import { COLOUR_FAMILIES, COLOUR_LABEL, FOOTWEAR_LABEL, FOOTWEAR_STYLES, type AssessmentResult, type ColourFamily, type Finding, type FootwearStyle, type UserCorrections } from "@/lib/schemas";
import { CheckIcon, ChevronIcon } from "../icons";

const BADGE: Record<AssessmentResult["status"], { cls: string }> = {
  compatible: { cls: "border-ok text-ok" },
  consider_change: { cls: "border-warn text-warn" },
  conflict: { cls: "border-bad text-bad" },
  insufficient: { cls: "border-line-strong text-ink-2" },
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
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div>
          <p className="eyebrow">{p.eventLabel}</p>
          <h1 className="mt-2 text-3xl font-bold">Checking your outfit</h1>
          <ol className="mt-6 space-y-3" aria-live="polite">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 ${i <= stage ? "text-ink" : "text-muted"}`}>
                <span className={`inline-flex size-6 items-center justify-center border ${i < stage ? "border-ink bg-ink text-bg" : i === stage && !error ? "border-ink" : "border-line"}`}>
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
                <button type="button" className="btn btn-secondary min-h-10 px-4 text-sm" onClick={() => run()}>Try again</button>
                <Link href={`/check/${p.checkId}/requirements`} className="btn btn-quiet text-sm">Edit requirements</Link>
                <Link href={`/check/${p.checkId}/outfit`} className="btn btn-quiet text-sm">Change photo</Link>
              </div>
            </div>
          ) : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${p.photoUrl}?size=thumb`} alt="Your outfit photo" className="w-full max-w-[280px] border border-line object-contain" />
      </div>
    );
  }

  // ---------- result ----------
  const res = data.result;
  const key = res.findings.find((f) => f.id === res.key_finding_id) ?? null;
  const secondary = res.findings.filter((f) => f.id !== key?.id && f.status !== "ok").slice(0, 4);
  const canPreview = Boolean(res.primary_action);
  const compatible = res.status === "compatible";

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <figure className="order-2 lg:order-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl} alt="Your original outfit photo" className="max-h-[72vh] w-full border border-line bg-raised object-contain" />
          <figcaption className="mt-2 text-xs text-muted">Original photo</figcaption>
        </figure>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">{p.eventLabel}</p>
          <p className={`mt-3 inline-flex border px-3 py-1.5 text-sm font-semibold ${BADGE[res.status].cls}`}>{res.headline}</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold leading-snug outline-none sm:text-3xl">
            {key ? key.observation : compatible ? "Nothing in your confirmed requirements conflicts with this outfit." : "We need a bit more information."}
          </h1>
          {key ? <p className="mt-3 text-lg leading-relaxed text-ink-2">{key.reason}</p> : null}
          {compatible ? <p className="mt-3 text-ink-2">This isn&rsquo;t approval from your host — it means we found no conflict with what you confirmed.</p> : null}

          {key ? (
            <div className="mt-4">
              <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4" aria-expanded={why} onClick={() => setWhy((w) => !w)}>
                Why? <ChevronIcon className={`size-4 transition ${why ? "rotate-180" : ""}`} />
              </button>
              {why ? (
                <dl className="mt-3 space-y-2 border-l-2 border-ink pl-4 text-sm">
                  <div><dt className="inline font-semibold">Type: </dt><dd className="inline">{KIND_LABEL[key.kind]}</dd></div>
                  <div><dt className="inline font-semibold">Source: </dt><dd className="inline">{SOURCE_LABEL[key.evidence_source]}</dd></div>
                  {key.evidence_text ? <div><dt className="inline font-semibold">Exact text: </dt><dd className="inline italic">“{key.evidence_text}”</dd></div> : null}
                  {key.uncertainty ? <div><dt className="inline font-semibold">Uncertainty: </dt><dd className="inline">{key.uncertainty}</dd></div> : null}
                </dl>
              ) : null}
            </div>
          ) : null}

          {res.clarification ? (
            <fieldset className="mt-6 border border-ink p-4" disabled={busy}>
              <legend className="px-1 text-sm font-semibold">One question first</legend>
              <p className="font-medium">{res.clarification.question}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {res.clarification.options.map((o) => (
                  <button key={o.value} type="button" className="btn btn-secondary min-h-10 px-4 text-sm"
                    onClick={() => {
                      const id = res.clarification!.id;
                      if (id === "main_garment_colour") answer({ main_garment_colour: o.value as ColourFamily });
                      else if (id === "footwear_style") answer({ footwear_style: o.value as FootwearStyle });
                      else answer({ rule_answers: { [id.slice(5)]: o.value as "applies" | "does_not_apply" } });
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
              {busy ? <p role="status" className="mt-2 text-sm text-muted">Updating your assessment…</p> : null}
            </fieldset>
          ) : null}

          {error ? <p role="alert" className="mt-4 border-l-2 border-bad pl-3 font-medium">{error.message}</p> : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            <button type="button" className="btn btn-quiet text-sm" aria-expanded={showCorrect} onClick={() => setShowCorrect((s) => !s)}>Correct my outfit details</button>
            <Link href={`/check/${p.checkId}/requirements`} className="btn btn-quiet text-sm">Edit event</Link>
            {key?.user_action === "retake_photo" || !res.shoes_assessable ? <Link href={`/check/${p.checkId}/outfit`} className="btn btn-quiet text-sm">Use a different photo</Link> : null}
          </div>

          {showCorrect ? (
            <form className="mt-4 grid gap-4 border border-line bg-raised p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); answer(corr); }}>
              <label className="block text-sm"><span className="font-medium">Main garment colour</span>
                <select className="field mt-1" value={corr.main_garment_colour ?? ""} onChange={(e) => setCorr({ ...corr, main_garment_colour: (e.target.value || undefined) as ColourFamily | undefined })}>
                  <option value="">Use what the photo shows</option>
                  {COLOUR_FAMILIES.map((c) => <option key={c} value={c}>{COLOUR_LABEL[c]}</option>)}
                </select>
              </label>
              <label className="block text-sm"><span className="font-medium">Shoe style</span>
                <select className="field mt-1" value={corr.footwear_style ?? ""} onChange={(e) => setCorr({ ...corr, footwear_style: (e.target.value || undefined) as FootwearStyle | undefined })}>
                  <option value="">Use what the photo shows</option>
                  {FOOTWEAR_STYLES.map((s) => <option key={s} value={s}>{FOOTWEAR_LABEL[s]}</option>)}
                </select>
              </label>
              <div className="sm:col-span-2"><button type="submit" className="btn btn-secondary min-h-10 px-4 text-sm" disabled={busy}>Update assessment</button></div>
            </form>
          ) : null}

          {p.hadOlderPreviews ? <p className="mt-6 text-sm text-muted">Earlier previews were made for a previous version of your requirements or photo and are kept separately.</p> : null}
        </div>
      </div>

      {/* Breakdown */}
      <section className="mt-12 max-w-3xl" aria-labelledby="h-breakdown">
        <h2 id="h-breakdown" className="text-xl font-semibold">Breakdown</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {(["clothing", "colour", "shoes_venue"] as const).map((area) => {
            const row = res.rows[area];
            const items = res.findings.filter((f) => f.area === area);
            return (
              <details key={area} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold">{area === "clothing" ? "Clothing" : area === "colour" ? "Colour & restrictions" : "Shoes & venue"}</span>
                  <span className="flex items-center gap-2 text-sm text-ink-2">{ROW_LABEL[row.status]} <ChevronIcon className="size-4 transition group-open:rotate-180" /></span>
                </summary>
                <div className="mt-3 space-y-4 text-sm">
                  {items.length === 0 ? <p className="text-ink-2">{row.summary}</p> : items.map((f) => (
                    <div key={f.id} className="border-l-2 border-line-strong pl-3">
                      <p className="font-medium">{f.observation}</p>
                      <p className="mt-1 text-ink-2">{f.reason}</p>
                      <p className="mt-1 text-xs text-muted">{KIND_LABEL[f.kind]} · {SOURCE_LABEL[f.evidence_source]}{f.uncertainty ? ` · ${f.uncertainty}` : ""}</p>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
        {secondary.length ? <p className="mt-3 text-sm text-muted">{secondary.length} other observation{secondary.length === 1 ? "" : "s"} listed above.</p> : null}
        <p className="mt-6 text-xs text-muted">We can&rsquo;t judge fabric quality, fit, comfort or heel stability from a photo.</p>
        <button type="button" className="btn btn-quiet mt-2 text-sm" onClick={() => { setData(null); started.current = true; void run({ reobserve: true }); }}>Re-read the photo</button>
      </section>
    </div>
  );
}
