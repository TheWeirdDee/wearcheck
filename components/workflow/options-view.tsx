"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ClientApiError, prepareImage } from "@/lib/client";
import type { RenderCategory } from "@/lib/schemas";

export type OptionItem = {
  id: string; title: string; category: RenderCategory; file: string; tags: string[];
  creator: string; licence: string; licence_url: string; source_name: string; source_url: string;
};

const CAT_LABEL: Record<RenderCategory, string> = { shoes: "Shoes", full_body: "Dress / full outfit", upper_body: "Top", outer: "Outerwear" };

type Props = {
  checkId: string;
  findingId: string;
  heading: string;
  reason: string;
  photoUrl: string;
  items: OptionItem[];
  allowedCategories: RenderCategory[];
  shoesAssessable: boolean;
  explore: boolean;
};

export function OptionsView(p: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<{ kind: "item"; item: OptionItem } | { kind: "user"; assetId: string; url: string; category: RenderCategory } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [byo, setByo] = useState<{ category: RenderCategory | ""; rights: boolean; uploading: boolean }>({ category: p.allowedCategories.length === 1 ? p.allowedCategories[0] : "", rights: false, uploading: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  async function uploadOwn(f: File | undefined) {
    if (!f || !byo.category) return;
    setError(null);
    setByo((b) => ({ ...b, uploading: true }));
    try {
      const prep = await prepareImage(f, 2048);
      const fd = new FormData();
      fd.append("file", prep.blob, "reference.jpg");
      fd.append("category", byo.category);
      fd.append("rights", byo.rights ? "accepted" : "");
      const r = await api<{ assetId: string; url: string; category: RenderCategory }>(`/api/checks/${p.checkId}/reference`, { method: "POST", body: fd });
      setSelected({ kind: "user", assetId: r.assetId, url: r.url, category: r.category });
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : (e as Error).message);
    } finally {
      setByo((b) => ({ ...b, uploading: false }));
    }
  }

  async function generate() {
    if (!selected || inFlight.current) return; // duplicate tap guard (server is idempotent too)
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const category = selected.kind === "item" ? selected.item.category : selected.category;
    try {
      const r = await api<{ jobId: string }>("/api/render-jobs", {
        method: "POST",
        body: JSON.stringify({
          checkId: p.checkId,
          findingId: p.explore ? `voluntary:${category}` : p.findingId,
          ...(selected.kind === "item" ? { itemId: selected.item.id } : { userAssetId: selected.assetId, userCategory: selected.category }),
        }),
      });
      router.push(`/check/${p.checkId}/preview?job=${r.jobId}`);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : "Couldn't start the preview.");
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <div>
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${p.photoUrl}?size=thumb`} alt="Your original outfit" className="hidden w-24 bg-photo object-cover sm:block" />
          <div>
            <p className="eyebrow plain">Step 3 · Choose one alternative</p>
            <h1 className="t-2 mt-3">{p.heading}</h1>
            <p className="lede mt-4">{p.reason}</p>
          </div>
        </div>

        {p.items.length ? (
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {p.items.map((it) => {
              const on = selected?.kind === "item" && selected.item.id === it.id;
              return (
                <li key={it.id} className={`flex flex-col outline-offset-4 ${on ? "outline-2 outline-ink" : ""}`}>
                  <div className="relative aspect-[4/5] bg-raised">
                    <Image src={`/reference/${it.file}`} alt={it.title} fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 92vw" className="object-contain p-4" />
                  </div>
                  <div className="flex flex-1 flex-col pt-4">
                    <p className="eyebrow plain">{CAT_LABEL[it.category]}</p>
                    <h2 className="mt-2 font-display text-lg font-semibold leading-snug">{it.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">{it.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
                    <p className="mt-3 text-[0.875rem] font-medium text-ink-2">Visual reference — not a live shopping listing.</p>
                    <p className="photo-credit mt-1">
                      Image: {it.creator}, <a href={it.licence_url} target="_blank" rel="license noopener noreferrer" className="underline">{it.licence}</a> ·{" "}
                      <a href={it.source_url} target="_blank" rel="noopener noreferrer" className="underline">source</a>
                    </p>
                    <button type="button" className={`btn btn-sm mt-auto ${on ? "btn-primary" : "btn-secondary"}`} aria-pressed={on} onClick={() => setSelected({ kind: "item", item: it })}>
                      {on ? "Selected" : "Try this"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-8 bg-raised p-5 text-ink-2">We don&rsquo;t have a licensed reference item that fits this finding without breaking another of your rules. You can try your own item below.</p>
        )}

        <section className="mt-16 border-t border-line pt-8" aria-labelledby="h-byo">
          <h2 id="h-byo" className="t-3">I have another item to try</h2>
          <p className="mt-2 text-ink-2">A clear, front-facing photo of one item on a plain background (or worn by one person). It will be marked “Provided by you”.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">What kind of item?</span>
              <select className="field" value={byo.category} onChange={(e) => setByo({ ...byo, category: e.target.value as RenderCategory })}>
                <option value="">Choose…</option>
                {p.allowedCategories.map((c) => <option key={c} value={c} disabled={c === "shoes" && !p.shoesAssessable}>{CAT_LABEL[c]}{c === "shoes" && !p.shoesAssessable ? " (feet not visible)" : ""}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[0.9rem] text-muted">Trousers and skirts aren&rsquo;t offered: the preview engine needs a photo of them being worn, which we can&rsquo;t verify here.</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-[0.95rem]">
            <input type="checkbox" className="mt-0.5 size-5 accent-[var(--ink)]" checked={byo.rights} onChange={(e) => setByo({ ...byo, rights: e.target.checked })} />
            I own this image or have permission to use it, and it shows no one other than a consenting adult.
          </label>
          <button type="button" className="btn btn-secondary btn-sm mt-5" disabled={!byo.category || !byo.rights || byo.uploading} onClick={() => fileRef.current?.click()}>
            {byo.uploading ? "Uploading…" : "Upload my item"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload your own reference item" onChange={(e) => uploadOwn(e.target.files?.[0])} />
        </section>
      </div>

      {/* Selection summary: sticky sidebar on desktop, bottom bar on mobile */}
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-[clamp(1rem,4vw,3.5rem)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0" aria-label="Selected item">
        <div className="lg:sticky lg:top-28 lg:bg-raised lg:p-5">
          <div className="flex items-center gap-3 lg:block">
            {selected ? (
              <div className="relative size-14 shrink-0 bg-bg lg:aspect-[4/5] lg:size-auto lg:w-full">
                {selected.kind === "item" ? (
                  <Image src={`/reference/${selected.item.file}`} alt="" fill sizes="300px" className="object-contain p-1" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- private, owner-only media route
                  <img src={selected.url} alt="" className="h-full w-full object-contain" />
                )}
              </div>
            ) : null}
            <div className="min-w-0 flex-1 lg:mt-3">
              <p className="truncate font-semibold lg:whitespace-normal">{selected ? (selected.kind === "item" ? selected.item.title : "Provided by you") : "Choose an item"}</p>
              <p className="text-[0.875rem] text-muted">The preview is AI-generated and isn&rsquo;t a fit guarantee.</p>
            </div>
          </div>
          {error ? <p role="alert" className="mt-2 text-[0.95rem] font-medium text-bad">{error}</p> : null}
          <button type="button" className="btn btn-primary mt-3 w-full" disabled={!selected || busy} onClick={generate} aria-busy={busy}>
            {busy ? "Starting preview…" : "Generate preview"}
          </button>
          <Link href={`/check/${p.checkId}/assessment`} className="btn btn-quiet mt-1 hidden w-full text-[0.95rem] lg:inline-flex">Back to assessment</Link>
        </div>
      </aside>
    </div>
  );
}
