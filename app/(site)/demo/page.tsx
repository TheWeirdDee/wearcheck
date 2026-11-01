import type { Metadata } from "next";
import Image from "next/image";
import { StartCheckButton } from "@/components/start-check-button";
import { DEMO_CASES, demoPhotoAvailable } from "@/lib/demo";
import { DEMO_CASES_PUBLIC } from "@/lib/demo-public";
import { SHOWCASE } from "@/lib/showcase";

export const metadata: Metadata = { title: "Examples you can run", description: "Three WearCheck scenarios that run the real pipeline live — including a no-change outcome." };
export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const photos = await Promise.all(DEMO_CASES.map((d) => demoPhotoAvailable(d.slug).catch(() => false)));
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <p className="eyebrow">Examples</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Run a real check in under two minutes.</h1>
      <div className="mt-5 max-w-2xl space-y-3 text-lg text-ink-2">
        <p>Each example starts a fresh private check with requirements <strong className="font-semibold text-ink">entered for the example</strong> — not an actual invitation. You review them, the vision model reads the photo, the rules decide, and any preview is a new, live YouCam task.</p>
        <p className="text-base text-muted">Nothing here is replayed. If a step fails, you&rsquo;ll see the real error.</p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        {DEMO_CASES.map((d, i) => {
          const pub = DEMO_CASES_PUBLIC.find((p) => p.slug === d.slug)!;
          return (
            <article key={d.slug} className="flex flex-col border-t-2 border-ink pt-5">
              <p className="eyebrow">{String(i + 1).padStart(2, "0")} · {pub.tag}</p>
              <h2 className="mt-3 text-2xl font-semibold">{d.title}</h2>
              <p className="mt-2 text-ink-2">{d.challenge}</p>
              <dl className="mt-5 space-y-2 border-y border-line py-4 text-sm">
                <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted">Dress code</dt><dd>{d.details.dress_code || "—"}</dd></div>
                <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted">Setting</dt><dd className="capitalize">{d.details.setting}</dd></div>
                <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted">Restrictions</dt><dd>{d.details.restrictions || "None stated"}</dd></div>
                <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted">Source</dt><dd>Entered for this example</dd></div>
              </dl>
              <p className="mt-4 text-sm text-ink-2">{d.expected}</p>
              <p className="mt-2 text-sm text-muted">
                {photos[i] ? "Uses a permissioned example photo." : "Example photo not yet provided — you'll be asked to add your own permissioned photo."}
              </p>
              <div className="mt-auto pt-6">
                <StartCheckButton demo={d.slug} className="btn btn-primary w-full">Run this example</StartCheckButton>
              </div>
            </article>
          );
        })}
      </div>

      {SHOWCASE.length ? (
        <section className="mt-20 border-t border-line pt-10">
          <p className="eyebrow">Previously generated reference</p>
          <h2 className="mt-3 text-2xl font-semibold">Recorded results from earlier live runs</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">These are saved outputs from real YouCam tasks, shown for comparison. They are not the result of a fresh call.</p>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {SHOWCASE.map((s) => (
              <figure key={s.previewSrc} className="grid grid-cols-2 gap-3">
                <div className="relative aspect-[3/4] border border-line"><Image src={s.originalSrc} alt="Original photo" fill sizes="25vw" className="object-cover" /></div>
                <div className="relative aspect-[3/4] border border-ink"><Image src={s.previewSrc} alt={`AI-generated preview: ${s.change}`} fill sizes="25vw" className="object-cover" /><span className="ai-label absolute left-2 top-2">AI preview</span></div>
                <figcaption className="col-span-2 text-sm text-muted">{s.feature} · recorded {s.recordedAt.slice(0, 10)} · {s.requirement} → {s.change}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
