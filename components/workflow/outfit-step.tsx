"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ClientApiError, prepareImage } from "@/lib/client";
import { EDITORIAL } from "@/lib/editorial";
import { CameraIcon, CheckIcon, UploadIcon } from "../icons";

const CONSENT = "This is my photo, or I have permission from the person shown, and they are an adult. I understand AI-generated previews may change appearance.";

export function OutfitStep({ checkId, existing }: { checkId: string; existing: { url: string; width: number; height: number } | null }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<{ url: string; width: number; height: number; saved: boolean; blob?: Blob } | null>(existing ? { ...existing, saved: true } : null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    try {
      const p = await prepareImage(f, 2048);
      if (Math.min(p.width, p.height) < 512) throw new Error(`This photo is ${p.width}×${p.height}px — please use one at least 512px on its short side (1024px or more works best).`);
      setPhoto({ url: p.previewUrl, width: p.width, height: p.height, saved: false, blob: p.blob });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onContinue() {
    if (!photo) return;
    if (photo.saved) {
      router.push(`/check/${checkId}/assessment`);
      return;
    }
    if (!consent) {
      setError("Please confirm the consent statement first.");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", photo.blob!, "outfit.jpg");
    fd.append("consent", "accepted");
    try {
      await api(`/api/checks/${checkId}/outfit`, { method: "PUT", body: fd });
      router.push(`/check/${checkId}/assessment`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : "Upload failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow plain">Step 2 · Your outfit</p>
      <h1 className="t-2 mt-3 max-w-[22ch]">Show us what you&rsquo;re planning to wear</h1>
      <p className="lede mt-4 max-w-[46ch]">One full-length photo. We&rsquo;ll tell you what we can and can&rsquo;t see.</p>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          {photo ? (
            <figure>
              <div className="flex justify-center bg-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Your outfit photo" className="max-h-[72vh] w-auto max-w-full object-contain" />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[0.9rem] text-muted">{photo.width}×{photo.height}px · {photo.saved ? "Saved to this check" : "Not uploaded yet"}</span>
                <span className="flex gap-5">
                  <button type="button" className="btn btn-quiet sm:hidden" onClick={() => camRef.current?.click()} disabled={busy}>Retake</button>
                  <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()} disabled={busy}>Change photo</button>
                </span>
              </figcaption>
            </figure>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
              className={`flex aspect-[4/5] max-h-[72vh] w-full flex-col items-center justify-center border border-dashed px-6 text-center transition-colors ${drag ? "border-ink bg-sunk" : "border-line-strong bg-raised"}`}
            >
              <CameraIcon className="size-9 text-ink-2" />
              <p className="mt-5 max-w-[24ch] font-display text-xl font-semibold leading-snug">Stand back so your whole outfit — shoes included — is in frame.</p>
              <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto">
                <button type="button" className="btn btn-primary" onClick={() => camRef.current?.click()}><CameraIcon className="size-5" /> Take photo</button>
                <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><UploadIcon className="size-5" /> Choose from gallery</button>
              </div>
              <p className="mt-4 hidden text-[0.9rem] text-muted sm:block">Or drag a photo here.</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" aria-label="Choose outfit photo" onChange={(e) => onFile(e.target.files?.[0])} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take outfit photo" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>

        <div className="min-w-0">
          <div className="flex gap-4 bg-raised p-4">
            <div className="relative aspect-[4/5] w-24 flex-none overflow-hidden bg-photo sm:w-28">
              <Image src={EDITORIAL.guideGood.src} alt="Example of a good photo: one person standing, head to feet in frame." fill sizes="112px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">A photo that works</p>
              <ul className="mt-2 space-y-1.5 text-[0.95rem] text-ink-2">
                {["One person, standing", "Head to feet in frame", "Daylight, plain background"].map((t) => (
                  <li key={t} className="flex gap-2"><CheckIcon className="mt-1 size-4 flex-none text-ok" />{t}</li>
                ))}
              </ul>
              <Link href="/help#photos" className="link mt-2 inline-block text-[0.9rem]">More photo examples</Link>
            </div>
          </div>

          {photo && !photo.saved ? (
            <label className="mt-6 flex cursor-pointer items-start gap-3 border border-ink p-4">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--ink)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="text-[0.95rem] leading-relaxed">{CONSENT}</span>
            </label>
          ) : null}

          {error ? <p role="alert" className="mt-6 border-l-2 border-bad pl-3 font-medium">{error}</p> : null}
          <div className="sticky bottom-0 -mx-[clamp(1rem,4vw,3.5rem)] mt-8 border-t border-line bg-bg/95 px-[clamp(1rem,4vw,3.5rem)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <button type="button" className="btn btn-primary w-full md:w-auto" disabled={!photo || busy || (!photo.saved && !consent)} onClick={onContinue} aria-busy={busy}>
              {busy ? "Uploading…" : "Continue to findings"}
            </button>
            <p className="mt-3 text-[0.9rem] text-muted" role="status" aria-live="polite">{busy ? "Checking the image…" : "Your photo is stored privately for this check only."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
