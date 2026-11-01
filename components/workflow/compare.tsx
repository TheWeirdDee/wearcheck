"use client";

import { useEffect, useRef, useState } from "react";

type Box = { cx: number; cy: number; w: number; h: number };

/**
 * Finds where the two images differ: both are drawn to the same small grid, and the bounding box of
 * the most-changed cells (trimmed of outliers) is the changed area. Returns null if nothing stands out.
 */
function changedArea(a: HTMLImageElement, b: HTMLImageElement): Box | null {
  const W = 72;
  const H = Math.round((W * a.naturalHeight) / a.naturalWidth);
  const read = (img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    return ctx.getImageData(0, 0, W, H).data;
  };
  const pa = read(a);
  const pb = read(b);
  if (!pa || !pb) return null;
  const diff: number[] = [];
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    diff.push(Math.abs(pa[o] - pb[o]) + Math.abs(pa[o + 1] - pb[o + 1]) + Math.abs(pa[o + 2] - pb[o + 2]));
  }
  const sorted = [...diff].sort((x, y) => x - y);
  const cut = Math.max(60, sorted[Math.floor(sorted.length * 0.95)]);
  const xs: number[] = [];
  const ys: number[] = [];
  diff.forEach((d, i) => {
    if (d >= cut) { xs.push(i % W); ys.push(Math.floor(i / W)); }
  });
  if (xs.length < 6) return null;
  const pct = (v: number[], p: number) => [...v].sort((x, y) => x - y)[Math.floor((v.length - 1) * p)];
  const x0 = pct(xs, 0.04), x1 = pct(xs, 0.96) + 1, y0 = pct(ys, 0.04), y1 = pct(ys, 0.96) + 1;
  return { cx: (x0 + x1) / 2 / W, cy: (y0 + y1) / 2 / H, w: (x1 - x0) / W, h: (y1 - y0) / H };
}

/**
 * Original / AI preview comparison in one shared frame: a draggable slider (pointer + touch + keyboard),
 * an Original / Compare / AI preview toggle, and a synchronized zoom onto the area that changed.
 * The frame is sized to the viewport so the whole person — feet included — stays on screen.
 */
export function Compare({ originalUrl, previewUrl, previewAlt }: { originalUrl: string; previewUrl: string; previewAlt: string }) {
  const [mode, setMode] = useState<"slider" | "original" | "preview">("slider");
  const [pos, setPos] = useState(50);
  const [ratio, setRatio] = useState(4 / 5);
  const [area, setArea] = useState<Box | null>(null);
  const [zoom, setZoom] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const origImg = useRef<HTMLImageElement | null>(null);
  const prevImg = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let live = true;
    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    Promise.all([load(originalUrl), load(previewUrl)]).then(([a, b]) => {
      if (!live) return;
      origImg.current = a;
      prevImg.current = b;
      setRatio(a.naturalWidth / a.naturalHeight);
      try { setArea(changedArea(a, b)); } catch { setArea(null); }
    }).catch(() => {});
    return () => { live = false; };
  }, [originalUrl, previewUrl]);

  const setFromX = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  // Same transform on both layers keeps the zoomed views aligned under the slider.
  const scale = area ? Math.min(3.2, Math.max(1.6, 0.75 / Math.max(area.w, area.h))) : 1;
  const transform = zoom && area
    ? `translate(${Math.max(-(scale - 1) / 2, Math.min((scale - 1) / 2, scale * (0.5 - area.cx))) * 100}%, ${Math.max(-(scale - 1) / 2, Math.min((scale - 1) / 2, scale * (0.5 - area.cy))) * 100}%) scale(${scale})`
    : "none";
  const imgCls = "absolute inset-0 block h-full w-full object-contain transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none";
  // Frame height leaves room for the sticky header, the controls row above it and a small margin below.
  const frameMax = "calc(100svh - 10.75rem)";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex border border-ink" role="group" aria-label="Comparison view">
          {(["original", "slider", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 px-4 text-[0.9rem] font-semibold transition-colors ${mode === m ? "bg-ink text-bg" : "hover:bg-sunk"}`}
            >
              {m === "original" ? "Original" : m === "preview" ? "AI preview" : "Compare"}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`min-h-11 border px-4 text-[0.9rem] font-semibold ${zoom ? "border-ink bg-ink text-bg" : "border-line-strong hover:bg-sunk"}`}
          aria-pressed={zoom}
          disabled={!area}
          title={area ? undefined : "No clearly changed area was found"}
          onClick={() => setZoom((z) => !z)}
        >
          {zoom ? "Show full photo" : "Zoom to the change"}
        </button>
      </div>

      <div
        ref={box}
        data-testid="compare-frame"
        className="relative mx-auto select-none overflow-hidden bg-photo touch-pan-y"
        style={{ aspectRatio: String(ratio), maxHeight: frameMax, width: `min(100%, calc(${frameMax} * ${ratio}))` }}
        onPointerDown={(e) => {
          if (mode !== "slider") return;
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) setFromX(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {/* Base layer: preview (or original in original-only mode) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mode === "original" ? originalUrl : previewUrl} alt={mode === "original" ? "Original outfit photo" : previewAlt} className={imgCls} style={{ transform }} draggable={false} />
        {mode === "slider" ? (
          <>
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalUrl} alt="" className={imgCls} style={{ transform }} draggable={false} />
            </div>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-bg" style={{ left: `${pos}%` }} aria-hidden>
              <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg text-ink shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)]">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(pos)}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Comparison slider: left shows the original photo, right shows the AI preview"
              aria-valuetext={`${Math.round(pos)}% original`}
              className="absolute inset-x-0 bottom-3 mx-auto w-[80%] accent-[var(--ink)]"
            />
          </>
        ) : null}
        {mode !== "preview" ? <span className="absolute left-2 top-2 bg-bg px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.08em]">Original</span> : null}
        {mode !== "original" ? <span className="ai-label absolute right-2 top-2">AI preview</span> : null}
        {zoom ? <span className="absolute bottom-12 left-2 bg-bg/90 px-2 py-0.5 text-[0.7rem] font-semibold">Zoomed to the changed area</span> : null}
      </div>
      <p className="photo-credit mt-3">AI-generated by YouCam. It may alter details and isn&rsquo;t proof of fit, size or comfort.{area ? " The zoom finds the area where the two images differ most." : ""}</p>
    </div>
  );
}
