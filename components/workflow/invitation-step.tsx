"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { api, ClientApiError, prepareImage } from "@/lib/client";
import { CameraIcon, UploadIcon } from "../icons";

type Manual = { event_name: string; event_type: string; dress_code: string; setting: string; restrictions: string; event_date: string };
const EMPTY: Manual = { event_name: "", event_type: "", dress_code: "", setting: "unknown", restrictions: "", event_date: "" };

export function InvitationStep({ checkId, initialManual }: { checkId: string; initialManual: Partial<Manual> | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "manual">(initialManual ? "manual" : "upload");
  const [file, setFile] = useState<{ blob: Blob; name: string; previewUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; manual: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const [manual, setManual] = useState<Manual>({ ...EMPTY, ...(initialManual ?? {}) });
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const ids = { tabs: useId(), up: useId(), man: useId() };

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    try {
      const p = await prepareImage(f, 2048);
      setFile({ blob: p.blob, name: f.name, previewUrl: p.previewUrl });
    } catch (e) {
      setError({ message: (e as Error).message, manual: true });
    }
  }

  async function submitUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file.blob, "invitation.jpg");
    try {
      const r = await api<{ nextPath: string }>(`/api/checks/${checkId}/invitation`, { method: "POST", body: fd });
      router.push(r.nextPath);
    } catch (e) {
      const err = e instanceof ClientApiError ? e.body : { message: "Something went wrong." };
      setError({ message: err.message, manual: true }); // every upload failure offers the manual fallback
      setBusy(false);
    }
  }

  async function submitManual(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ nextPath: string }>(`/api/checks/${checkId}/event`, {
        method: "PUT",
        body: JSON.stringify({ ...manual, event_type: manual.event_type || null }),
      });
      router.push(r.nextPath);
    } catch (e) {
      setError({ message: e instanceof ClientApiError ? e.body.message : "Something went wrong.", manual: false });
      setBusy(false);
    }
  }

  const tabBtn = (key: "upload" | "manual", label: string, panel: string) => (
    <button
      type="button"
      role="tab"
      id={`${ids.tabs}-${key}`}
      aria-selected={tab === key}
      aria-controls={panel}
      tabIndex={tab === key ? 0 : -1}
      onClick={() => setTab(key)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const next = tab === "upload" ? "manual" : "upload";
          setTab(next);
          document.getElementById(`${ids.tabs}-${next}`)?.focus();
        }
      }}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold ${tab === key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">What&rsquo;s the occasion?</h1>
      <p className="mt-3 text-lg text-ink-2">Add an invitation, screenshot or the details you received.</p>

      <div role="tablist" aria-label="How to add the event" className="mt-8 flex gap-6 border-b border-line">
        {tabBtn("upload", "Upload invitation", ids.up)}
        {tabBtn("manual", "Enter details", ids.man)}
      </div>

      {error ? (
        <div role="alert" className="mt-6 border-l-2 border-bad bg-raised p-4">
          <p className="font-medium">{error.message}</p>
          {error.manual && tab === "upload" ? (
            <button type="button" className="btn btn-quiet mt-1" onClick={() => setTab("manual")}>Enter the details instead</button>
          ) : null}
        </div>
      ) : null}

      <div id={ids.up} role="tabpanel" aria-labelledby={`${ids.tabs}-upload`} hidden={tab !== "upload"} className="mt-6">
        {file ? (
          <div className="flex flex-col gap-4 border border-line bg-raised p-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.previewUrl} alt="Selected invitation" className="max-h-72 w-full border border-line object-contain sm:w-48" />
            <div className="flex flex-1 flex-col">
              <p className="break-all font-medium">{file.name}</p>
              <p className="text-sm text-muted">Ready to read</p>
              <div className="mt-auto flex gap-4 pt-4">
                <button type="button" className="btn btn-quiet" onClick={() => fileRef.current?.click()} disabled={busy}>Replace</button>
                <button type="button" className="btn btn-quiet" onClick={() => setFile(null)} disabled={busy}>Remove</button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
            className={`flex flex-col items-center border border-dashed px-6 py-12 text-center ${drag ? "border-ink bg-sunk" : "border-line-strong bg-raised"}`}
          >
            <CameraIcon className="size-8 text-ink-2" />
            <p className="mt-4 font-medium">Drop an image of the invitation here</p>
            <p className="mt-1 text-sm text-muted">JPG, PNG or WebP. HEIC if your browser can open it. For PDFs, use a screenshot.</p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><UploadIcon className="size-5" /> Choose image</button>
              <button type="button" className="btn btn-secondary sm:hidden" onClick={() => camRef.current?.click()}><CameraIcon className="size-5" /> Take photo</button>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" aria-label="Choose invitation image" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a photo of the invitation" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="sticky bottom-0 -mx-4 mt-8 border-t border-line bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!file || busy} onClick={submitUpload} aria-describedby="inv-status">
            {busy ? "Reading the invitation…" : "Continue"}
          </button>
          <p id="inv-status" role="status" aria-live="polite" className="mt-3 text-sm text-muted">
            {busy ? "Reading the invitation… this usually takes a few seconds." : "We use these details only to check this outfit."}
          </p>
        </div>
      </div>

      <form id={ids.man} role="tabpanel" aria-labelledby={`${ids.tabs}-manual`} hidden={tab !== "manual"} className="mt-6 space-y-5" onSubmit={submitManual}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Occasion</span>
            <select className="field mt-1" value={manual.event_type} onChange={(e) => setManual({ ...manual, event_type: e.target.value })}>
              <option value="">Choose…</option>
              <option value="wedding">Wedding</option>
              <option value="work">Work</option>
              <option value="celebration">Celebration</option>
              <option value="religious">Religious event</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Event name <span className="font-normal text-muted">(optional)</span></span>
            <input className="field mt-1" value={manual.event_name} maxLength={120} onChange={(e) => setManual({ ...manual, event_name: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Dress code, as written <span className="font-normal text-muted">(optional)</span></span>
          <input className="field mt-1" placeholder="e.g. Cocktail, Black tie, Smart casual" value={manual.dress_code} maxLength={120} onChange={(e) => setManual({ ...manual, dress_code: e.target.value })} />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Location</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {["indoor", "outdoor", "mixed", "unknown"].map((s) => (
              <label key={s} className={`cursor-pointer border px-4 py-2 text-sm capitalize ${manual.setting === s ? "border-ink bg-ink text-bg" : "border-line-strong"}`}>
                <input type="radio" name="setting" value={s} checked={manual.setting === s} onChange={() => setManual({ ...manual, setting: s })} className="sr-only" />
                {s === "unknown" ? "Not sure" : s}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-sm font-medium">Restrictions or notes <span className="font-normal text-muted">(one per line, optional)</span></span>
          <textarea className="field mt-1" placeholder={"e.g. Please avoid white or ivory\nCeremony on the lawn — flats recommended"} value={manual.restrictions} maxLength={1000} onChange={(e) => setManual({ ...manual, restrictions: e.target.value })} />
        </label>
        <label className="block sm:w-1/2">
          <span className="text-sm font-medium">Event date <span className="font-normal text-muted">(optional)</span></span>
          <input type="date" className="field mt-1" value={manual.event_date} onChange={(e) => setManual({ ...manual, event_date: e.target.value })} />
        </label>
        <p className="text-sm text-muted">Optional fields can stay empty. “Formal” means different things in different places — you&rsquo;ll confirm everything next.</p>
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>{busy ? "Saving…" : "Continue"}</button>
          <p className="mt-3 text-sm text-muted">We use these details only to check this outfit.</p>
        </div>
      </form>
    </div>
  );
}
