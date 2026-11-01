import type { Metadata } from "next";
import { StartCheckButton } from "@/components/start-check-button";

export const metadata: Metadata = { title: "Photo guide & FAQ", description: "How to take a photo WearCheck can check, and how to read the verdict." };

function PhotoDiagram({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col">
      <div className={`relative aspect-[3/4] border ${ok ? "border-ink" : "border-line"} bg-raised p-4`}>
        <svg viewBox="0 0 120 160" className="h-full w-full text-ink" aria-hidden>
          <rect x="1" y="1" width="118" height="158" fill="none" stroke="var(--line-strong)" strokeDasharray="3 3" />
          {children}
        </svg>
        <span className={`absolute left-2 top-2 chip bg-bg ${ok ? "" : "line-through"}`}>{ok ? "Works" : "Avoid"}</span>
      </div>
      <figcaption className="mt-2 text-sm text-ink-2">{label}</figcaption>
    </figure>
  );
}

const person = (x: number, y: number, s = 1, crop = false) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="0" cy="10" r="7" />
    <path d="M-10 20c4-3 16-3 20 0l2 26-3 3c2 14 6 30 10 46h-38c4-16 8-32 10-46l-3-3z" fill="var(--bg-sunk)" />
    {!crop && <path d="M-4 95l-1 30M4 95l1 30M-9 125h6M3 125h6" />}
  </g>
);

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <p className="eyebrow">Help</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Take a good photo</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">WearCheck and the YouCam preview both work best with a clear, front-facing, full-length photo of one person standing.</p>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PhotoDiagram ok label="One person, head to toe, facing the camera, feet visible.">{person(60, 18)}</PhotoDiagram>
        <PhotoDiagram ok={false} label="Feet cropped: we can't check or preview shoes.">{person(60, 40, 1.3, true)}</PhotoDiagram>
        <PhotoDiagram ok={false} label="More than one person: we can't tell whose outfit to check.">{person(38, 22, 0.85)}{person(84, 22, 0.85)}</PhotoDiagram>
        <PhotoDiagram ok={false} label="Very dim or coloured light makes garment colour unreliable.">
          <rect x="1" y="1" width="118" height="158" fill="currentColor" opacity="0.55" />{person(60, 18)}
        </PhotoDiagram>
      </div>
      <ul className="mt-8 grid gap-3 text-ink-2 sm:grid-cols-3">
        <li className="border-t border-line pt-3"><strong className="text-ink">Daylight helps.</strong> Colour rules (like “no ivory”) depend on it; we&rsquo;ll ask you to confirm if unsure.</li>
        <li className="border-t border-line pt-3"><strong className="text-ink">Plain background.</strong> Mirrors and busy rooms can confuse both models.</li>
        <li className="border-t border-line pt-3"><strong className="text-ink">JPG, PNG or WebP.</strong> At least 1024px tall is best. HEIC works if your browser can open it.</li>
      </ul>

      <h2 id="verdict" className="mt-20 scroll-mt-20 text-3xl font-bold sm:text-4xl">Understand the verdict</h2>
      <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2">
        {[
          ["Looks compatible with the stated requirements", "Nothing you confirmed conflicts with what's visible. It isn't approval from your host."],
          ["One change worth considering", "A recommendation or a practical point (like heels on grass). Not a broken rule."],
          ["Potential dress-code conflict", "Only when an explicit rule you confirmed clearly contradicts something you confirmed or we can clearly see."],
          ["Not enough information", "We can't see something that matters, or we need you to answer one question first."],
        ].map(([t, d]) => (
          <div key={t} className="bg-bg p-6">
            <dt className="font-semibold">{t}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink-2">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-muted">
        Sources are always shown: <span className="chip">From invitation</span> quotes the exact wording, <span className="chip">Entered by you</span> is what you typed, and <span className="chip">Suggested — confirm</span> is the model&rsquo;s inference that you approved.
      </p>

      <h2 className="mt-20 text-3xl font-bold sm:text-4xl">FAQ</h2>
      <div className="mt-6 divide-y divide-line border-y border-line">
        {[
          ["What if the invitation is ambiguous?", "Phrases like “dress to impress” or “festive chic” don't define specific clothing. WearCheck tells you it's ambiguous, doesn't invent hard rules, and lets you add context such as the venue."],
          ["Why does the preview look different from me?", "Virtual try-on is generative. It can change lighting, fabric texture, hands, hair or background. Use it to judge the idea of the change, not the details."],
          ["Can it tell me my size or whether shoes will be comfortable?", "No. It can't measure fit, sizing, comfort, stability or suitability for terrain. Generated shoes are a visual only."],
          ["Does it understand religious or cultural dress requirements?", "Only what the invitation states explicitly and you confirm. It doesn't claim to know etiquette for any culture or faith; ask your host."],
          ["Whose instructions win?", "The event organiser's. WearCheck is style guidance, not approval."],
          ["Can I try my own item?", "Yes — on the options step, upload a clear photo of an item you own or are considering, and choose its category. It's labelled “Provided by you”."],
        ].map(([q, a]) => (
          <details key={q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {q}<span aria-hidden className="mt-1 text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
      <div className="mt-14"><StartCheckButton className="btn btn-primary">Check my outfit</StartCheckButton></div>
    </div>
  );
}
