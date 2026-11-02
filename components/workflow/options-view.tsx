"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { api, ClientApiError, prepareImage } from "@/lib/client";
import type { RenderCategory } from "@/lib/schemas";

export type OptionItem = {
  id: string; title: string; category: RenderCategory; file: string; tags: string[];
  creator: string; licence: string; licence_url: string; source_name: string; source_url: string;
  /** Why this item is offered, from the confirmed requirements and the visible garment. */
  reasons: string[];
};

type Props = {
  checkId: string;
  /** The finding this change addresses, or null for an optional change. */
  findingId: string | null;
  category: RenderCategory;
  why: string;
  photoUrl: string;
  items: OptionItem[];
  /** All reference items in this category, before filtering by requirements. */
  catalogueTotal: number;
  changeCategoryHref: string | null;
};

type Selected = { kind: "item"; item: OptionItem } | { kind: "user"; assetId: string; url: string };

/**
 * One change, chosen deliberately: what is being replaced, by what, and why — then YouCam generates it.
 * Two first-class paths: an item the person owns or is considering, or a licensed reference item.
 */
export function OptionsView(p: Props) {
  const router = useRouter();
  const meta = CATEGORY_META[p.category];
  const [selected, setSelected] = useState<Selected | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  async function uploadOwn(f: File | undefined) {
    if (!f) return;
    setError(null);
    setUploading(true);
    try {
      const prep = await prepareImage(f, 2048);
      const fd = new FormData();
      fd.append("file", prep.blob, "reference.jpg");
      fd.append("category", p.category);
      fd.append("rights", rights ? "accepted" : "");
      const r = await api<{ assetId: string; url: string }>(`/api/checks/${p.checkId}/reference`, { method: "POST", body: fd });
      setSelected({ kind: "user", assetId: r.assetId, url: r.url });
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : (e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function generate() {
    if (!selected || inFlight.current) return; // duplicate tap guard (server is idempotent too)
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ jobId: string }>("/api/render-jobs", {
        method: "POST",
        body: JSON.stringify({
          checkId: p.checkId,
          findingId: p.findingId ?? `voluntary:${p.category}`,
          ...(selected.kind === "item" ? { itemId: selected.item.id } : { userAssetId: selected.assetId, userCategory: p.category }),
        }),
      });
      router.push(`/check/${p.checkId}/preview?job=${r.jobId}`);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : "Couldn't start the preview.");
      setBusy(false);
      inFlight.current = false;
    }
  }

  const selectedTitle = selected ? (selected.kind === "item" ? selected.item.title : "Your item (provided by you)") : null;

  return (
    <div className="pb-56" data-wide-workflow>
      <p className="eyebrow plain">Step 3 · {p.findingId ? "Choose one change" : "Optional change"}</p>
      <h1 className="t-2 mt-3">Change the {meta.noun}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="bg-raised p-4">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-2">Why this change</p>
          <p className="mt-1">{p.why}</p>
        </div>
        <div className="bg-raised p-4">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-2">What gets replaced</p>
          <p className="mt-1">{meta.replaces}</p>
          <p className="mt-1 text-[0.9rem] text-ink-2">{meta.plain}</p>
        </div>
      </div>
      {p.changeCategoryHref ? <Link href={p.changeCategoryHref} className="btn btn-quiet mt-2 text-[0.95rem]">Change something else instead</Link> : null}

      {/* Path 1: the person's own item */}
      <section className="mt-10 border border-line-strong p-5 sm:p-6" aria-labelledby="h-own">
        <h2 id="h-own" className="t-3">Try an item you own or are considering</h2>
        <p className="mt-2 max-w-[60ch] text-ink-2">A clear, front-facing photo of one {p.category === "shoes" ? "pair of shoes" : "garment"} on a plain background, or a product photo. It&rsquo;s marked &ldquo;Provided by you&rdquo; and stays private to this check. WearCheck does not verify the uploaded item&rsquo;s category or suitability: check it against your requirements before generating.</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-[0.95rem]">
          <input type="checkbox" className="mt-0.5 size-5 accent-[var(--ink)]" checked={rights} onChange={(e) => setRights(e.target.checked)} />
          I own this image or have permission to use it, and it shows no one other than a consenting adult.
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="button" className="btn btn-secondary" disabled={!rights || uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading…" : `Upload a photo of the ${p.category === "shoes" ? "shoes" : "item"}`}
          </button>
          {selected?.kind === "user" ? (
            <span className="inline-flex items-center gap-3 text-[0.95rem] font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, owner-only media route */}
              <img src={selected.url} alt="Your uploaded item" className="size-16 bg-bg object-contain" />
              Selected: your item
            </span>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload your own reference item" onChange={(e) => uploadOwn(e.target.files?.[0])} />
      </section>

      {/* Path 2: licensed reference items, ranked with reasons */}
      <section className="mt-10" aria-labelledby="h-ref">
        <h2 id="h-ref" className="t-3">Or pick a reference item</h2>
        <p className="mt-2 max-w-[68ch] text-ink-2" data-testid="catalogue-note">
          {p.catalogueTotal === 0
            ? "WearCheck has no reference items for this category. Upload your own item above."
            : p.items.length === 0
              ? `None of WearCheck's ${p.catalogueTotal} reference ${p.catalogueTotal === 1 ? "item" : "items"} for this category meets your confirmed requirements, so none is offered. Upload your own item above — WearCheck can't confirm it meets the rule either.`
              : p.catalogueTotal === 1
                ? "WearCheck has one licensed reference photo for this category, and it fits your confirmed requirements. It's an example to visualise the change — not a product, stock or a personal recommendation."
                : `WearCheck has ${p.catalogueTotal} licensed reference photos for this category; ${p.items.length === p.catalogueTotal ? "all of them fit" : `${p.items.length} ${p.items.length === 1 ? "fits" : "fit"}`} your confirmed requirements, ranked below. It's a small demo set of examples — not products, stock or personal recommendations.`}
        </p>
        {p.items.length ? (
          <ul className={`mt-6 grid gap-x-6 gap-y-10 ${p.items.length === 1 ? "grid-cols-1" : "grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))]"}`} data-testid="catalogue">
            {p.items.map((it, i) => {
              const on = selected?.kind === "item" && selected.item.id === it.id;
              return (
                <li key={it.id} className={`min-w-0 p-4 ${p.items.length === 1 ? "grid items-start gap-6 sm:grid-cols-2" : "flex flex-col"} ${on ? "outline-2 outline-ink" : "outline outline-1 outline-line"}`}>
                  <div className="relative aspect-square w-full bg-raised">
                    <Image src={`/reference/${it.file}`} alt={it.title} fill sizes="(min-width: 1024px) 24vw, (min-width: 640px) 44vw, 92vw" className="object-contain p-3" />
                    {i === 0 && p.items.length > 1 ? <span className="absolute left-2 top-2 bg-ink px-2 py-0.5 text-[0.75rem] font-semibold text-bg">Highest ranked available reference</span> : null}
                  </div>
                  <div className="flex flex-1 flex-col pt-4">
                    <h3 className="font-display text-lg font-semibold leading-snug">{it.title}</h3>
                    <p className="mt-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-2">Why it&rsquo;s offered</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[0.95rem]" data-testid="reasons">{it.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                    <div className="mt-3 flex flex-wrap gap-1.5">{it.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
                    <p className="photo-credit mt-3">
                      Visual reference, not a shopping listing. Image: {it.creator}, <a href={it.licence_url} target="_blank" rel="license noopener noreferrer" className="underline">{it.licence}</a> ·{" "}
                      <a href={it.source_url} target="_blank" rel="noopener noreferrer" className="underline">source</a>
                    </p>
                    <button type="button" className={`btn btn-sm mt-4 ${on ? "btn-primary" : "btn-secondary"}`} aria-pressed={on} onClick={() => setSelected({ kind: "item", item: it })}>
                      {on ? "Selected" : "Select this item"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {selected ? (
        <section className="mt-10 border-t border-line pt-8" aria-labelledby="h-generation-review" data-testid="generation-review">
          <h2 id="h-generation-review" className="t-3">Review before generating</h2>
          <p className="mt-2">Replacing your {meta.noun}. {p.why}</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photoUrl} alt="Original photo for generation" className="h-64 w-full bg-photo object-contain sm:h-80" />
              <figcaption className="mt-2 font-semibold">Original photo</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.kind === "item" ? `/reference/${selected.item.file}` : selected.url} alt={`Reference for generation: ${selectedTitle}`} className="h-64 w-full bg-raised object-contain sm:h-80" />
              <figcaption className="mt-2 font-semibold">{selectedTitle}</figcaption>
            </figure>
          </div>
          <p className="mt-4 text-ink-2">Gemini extracts visible details. WearCheck checks confirmed requirements and filters references. YouCam generates this preview. Generation does not prove that a requirement has been met; inspect the whole result, including unchanged layers.</p>
        </section>
      ) : null}

      {/* What will be generated: original → reference, what's replaced, by which API — then one primary action */}
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur" aria-label="Your selection" data-testid="selection-bar">
        <div className="wrap flex flex-wrap items-center gap-x-3 gap-y-3 sm:flex-nowrap sm:gap-x-5">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <figure className="w-10 sm:w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${p.photoUrl}?size=thumb`} alt="Your original photo" className="aspect-[4/5] w-full bg-photo object-contain" />
            </figure>
            <span aria-hidden className="text-lg text-muted sm:text-xl">→</span>
            <figure className="flex aspect-[4/5] w-10 items-center justify-center bg-raised sm:w-20">
              {selected?.kind === "item" ? (
                // eslint-disable-next-line @next/next/no-img-element -- small static thumbnail; next/image left it blank here
                <img src={`/reference/${selected.item.file}`} alt={`Selected: ${selected.item.title}`} className="h-full w-full object-contain p-0.5" />
              ) : selected?.kind === "user" ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, owner-only media route
                <img src={selected.url} alt="Selected: your item" className="h-full w-full object-contain" />
              ) : <span className="text-[0.7rem] text-muted">none</span>}
            </figure>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9rem] font-semibold sm:text-base">{selectedTitle ?? "Select an item, or upload your own"}</p>
            <p className="text-[0.8125rem] text-ink-2 sm:text-[0.875rem]">Replaces your {meta.noun} · generated by YouCam {meta.provider}</p>
            <p className="hidden truncate text-[0.875rem] text-muted md:block">Why: {p.why}</p>
            {error ? <p role="alert" className="text-[0.875rem] font-medium text-bad">{error}</p> : null}
          </div>
          <button type="button" className="btn btn-primary w-full shrink-0 px-4 sm:w-auto sm:px-6" disabled={!selected || busy || uploading} onClick={generate} aria-busy={busy}>
            {busy ? "Starting…" : <><span className="sm:hidden">Generate</span><span className="hidden sm:inline">Generate preview</span></>}
          </button>
        </div>
      </aside>
    </div>
  );
}
