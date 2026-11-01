import Image from "next/image";
import { SHOWCASE } from "@/lib/showcase";

function Figure({ shoe }: { shoe: "heel" | "wedge" }) {
  return (
    <svg viewBox="0 0 200 400" className="h-full w-full" role="img" aria-label={shoe === "heel" ? "Line drawing of a person in a knee-length dress wearing narrow high heels" : "Line drawing of the same outfit with wedge shoes"}>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="100" cy="42" rx="13" ry="16" />
        <path d="M95 58v10M105 58v10" />
        <path d="M78 74Q100 68 122 74L126 120Q118 128 120 140L142 290Q100 300 58 290L80 140Q82 128 74 120Z" fill="var(--bg-sunk)" />
        <path d="M80 140Q100 146 120 140" strokeWidth="1" />
        <path d="M78 77Q65 120 70 172M122 77Q135 120 130 172" />
        <path d="M91 294L89 358M109 294L111 358" />
        {shoe === "heel" ? (
          <>
            <path d="M92 356L92 365L73 373Q69 373 71 369Z" fill="currentColor" />
            <path d="M91 364L91 386" strokeWidth="1.8" />
            <path d="M108 356L108 365L127 373Q131 373 129 369Z" fill="currentColor" />
            <path d="M109 364L109 386" strokeWidth="1.8" />
          </>
        ) : (
          <>
            <path d="M93 354L93 386L71 386Q66 382 72 375Z" fill="currentColor" />
            <path d="M107 354L107 386L129 386Q134 382 128 375Z" fill="currentColor" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Demonstrates the actual mechanism. Uses a verified render when one is recorded; otherwise a labelled illustration. */
export function HeroVisual() {
  const real = SHOWCASE[0];
  return (
    <div className="relative">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:gap-4">
        {/* Invitation requirement */}
        <figure className="col-span-2 border border-line bg-raised p-4 sm:p-5">
          <figcaption className="eyebrow">Invitation excerpt</figcaption>
          <p className="mt-2 font-display text-[1.05rem] leading-snug sm:text-lg">
            Join us for the ceremony in the walled garden.{" "}
            <mark className="bg-transparent px-0 text-ink underline decoration-accent decoration-2 underline-offset-4">Outdoor ceremony · flats or wedges</mark>{" "}
            recommended.
          </p>
          <p className="mt-2 text-xs text-muted">You confirm every rule before anything is checked.</p>
        </figure>

        {/* Original outfit */}
        <figure className="relative flex aspect-[3/4] flex-col border border-line bg-raised">
          <span className="absolute left-2 top-2 z-10 bg-bg px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em]">{real ? "Original photo" : "Your outfit"}</span>
          {real ? (
            <Image src={real.originalSrc} alt="Original outfit photo" fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover" priority />
          ) : (
            <div className="relative flex-1 px-3 pb-2 pt-9 text-ink">
              <Figure shoe="heel" />
              <span className="absolute bottom-2 left-2 border-l-2 border-accent bg-bg px-2 py-1 text-[0.7rem] font-semibold">Narrow heels</span>
            </div>
          )}
        </figure>

        {/* AI preview */}
        <figure className="relative flex aspect-[3/4] flex-col border border-ink bg-raised">
          <span className="ai-label absolute left-2 top-2 z-10">AI preview</span>
          {real ? (
            <Image src={real.previewSrc} alt={`AI-generated preview: ${real.change}`} fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover" priority />
          ) : (
            <div className="relative flex-1 px-3 pb-2 pt-9 text-ink">
              <Figure shoe="wedge" />
              <div className="absolute bottom-2 right-2 w-[32%] border border-line bg-bg p-1">
                <div className="relative aspect-[4/3]">
                  <Image src="/reference/wedge-black-sandal.jpg" alt="Reference: black strap wedge sandal" fill sizes="120px" className="object-cover" />
                </div>
                <p className="mt-1 text-[0.55rem] leading-tight text-muted">Reference · CC BY 2.0</p>
              </div>
            </div>
          )}
        </figure>
        {!real ? (
          <div className="col-span-2 flex flex-col gap-1 border-l-2 border-accent bg-raised px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-3">
            <span className="eyebrow shrink-0 text-accent">Finding</span>
            <span>Narrow heels on a lawn; the invitation recommends flats or wedges. <strong className="font-semibold">One change:</strong> try a wedge.</span>
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {real
          ? `Recorded example: a real YouCam ${real.feature} result from ${real.recordedAt.slice(0, 10)}. Shown with permission. Run an example to generate a fresh one.`
          : "Illustration of how a check works — not a real render. Real previews are generated live by YouCam when you run a check or an example."}
      </p>
    </div>
  );
}
