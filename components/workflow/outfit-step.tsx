"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ClientApiError, prepareImage } from "@/lib/client";
import { CameraIcon, UploadIcon } from "../icons";

const CONSENT = "This is my photo, or I have permission from the person shown, and they are an adult. I understand AI-generated previews may change appearance.";

function Silhouette() {
  return (
    <svg viewBox="0 0 120 200" className="h-40 text-line-strong" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4">
        <rect x="2" y="2" width="116" height="196" />
        <circle cx="60" cy="30" r="12" />
        <path d="M42 50c6-4 30-4 36 0l3 34-4 4c3 20 8 42 13 62H30c5-20 10-42 13-62l-4-4z" />
        <path d="M52 150l-2 30M68 150l2 30" />
        <path d="M42 180h10M68 180h10" strokeDasharray="0" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export function OutfitStep({ checkId, existing }: { checkId: string; existing: { url: string; width: number; height: number } | null }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<{ url: string; width: number; height: number; saved: boolean; blob?: Blob } | null>(existing ? { ...existing, saved: true } : null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Show us what you&rsquo;re planning to wear</h1>
      <p className="mt-3 text-lg text-ink-2">One full-length photo. We&rsquo;ll tell you what we can and can&rsquo;t see.</p>

      {photo ? (
        <figure className="mt-8">
          <div className="flex justify-center border border-line bg-raised p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Your outfit photo" className="max-h-[70vh] w-auto max-w-full object-contain" />
          </div>
          <figcaption className="mt-2 text-sm text-muted">{photo.width}×{photo.height}px · {photo.saved ? "Saved to this check" : "Not uploaded yet"}</figcaption>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <button type="button" className="btn btn-quiet sm:hidden" onClick={() => camRef.current?.click()} disabled={busy}>Retake</button>
            <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()} disabled={busy}>Change photo</button>
          </div>
        </figure>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
          className="mt-8 flex flex-col items-center gap-6 border border-dashed border-line-strong bg-raised px-6 py-10 text-center sm:flex-row sm:text-left"
        >
          <Silhouette />
          <div className="flex-1">
            <p className="font-medium">Stand back so your whole outfit — shoes included — is in the frame.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn btn-secondary" onClick={() => camRef.current?.click()}><CameraIcon className="size-5" /> Take photo</button>
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><UploadIcon className="size-5" /> Choose from gallery</button>
            </div>
            <p className="mt-3 hidden text-sm text-muted sm:block">Or drag a photo here.</p>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" aria-label="Choose outfit photo" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take outfit photo" onChange={(e) => onFile(e.target.files?.[0])} />

      <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {["One person", "Face and clothing visible", "Include your shoes for a shoe check"].map((t) => (
          <li key={t} className="border-t border-line pt-3">{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted"><Link href="/help" className="underline">See photo examples</Link></p>

      {photo && !photo.saved ? (
        <label className="mt-8 flex items-start gap-3 border border-line bg-raised p-4">
          <input type="checkbox" className="mt-1 size-5 shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="text-sm leading-relaxed">{CONSENT}</span>
        </label>
      ) : null}

      {error ? <p role="alert" className="mt-6 border-l-2 border-bad pl-3 font-medium">{error}</p> : null}
      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-line bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!photo || busy || (!photo.saved && !consent)} onClick={onContinue}>
          {busy ? "Uploading…" : "Continue"}
        </button>
        <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">{busy ? "Checking the image…" : "You can finish this check without signing up."}</p>
      </div>
    </div>
  );
}
