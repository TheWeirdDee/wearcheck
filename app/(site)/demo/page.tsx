import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { StartCheckButton } from "@/components/start-check-button";
import { Compare } from "@/components/workflow/compare";
import { DEMO_CASES, demoPhotoAvailable } from "@/lib/demo";
import { DEMO_CASES_PUBLIC } from "@/lib/demo-public";
import { SHOWCASE } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Examples",
  description: "Three WearCheck example occasions — a footwear recommendation, a colour request, and an outfit that needs no change.",
};
export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const photos = await Promise.all(DEMO_CASES.map((d) => demoPhotoAvailable(d.slug).catch(() => false)));
  return (
    <>
      <section className="wrap pb-6 pt-10 lg:pt-16">
        <p className="eyebrow">Examples</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end [&>*]:min-w-0">
          <h1 className="t-1 max-w-[16ch]">Three occasions. Try any of them with your own outfit.</h1>
          <div className="space-y-3 text-ink-2">
            <p>
              Each example opens a new private check with the event requirements <strong className="font-semibold text-ink">filled in for the example</strong>. They are example details, not an invitation, and are labelled that way throughout.
            </p>
            <p>The check itself is the normal one: your photo is read by the vision model, the rules decide, and a preview is only made if you ask for one.</p>
          </div>
        </div>
      </section>

      <div className="wrap pb-10">
        {DEMO_CASES.map((d, i) => {
          const pub = DEMO_CASES_PUBLIC.find((p) => p.slug === d.slug)!;
          const flip = i % 2 === 1;
          return (
            <article key={d.slug} aria-labelledby={`ex-${d.slug}`} className="grid gap-8 border-t border-line py-12 md:grid-cols-12 md:gap-10 lg:py-16 [&>*]:min-w-0">
              <Reveal className={`md:col-span-5 ${flip ? "md:order-2 md:col-start-8" : ""}`}>
                <figure>
                  <div className="img-reveal img-zoom relative aspect-[4/5] overflow-hidden bg-photo">
                    <Image src={pub.image.src} alt={pub.image.alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                  </div>
                  <figcaption className="photo-credit mt-3">{pub.image.credit}. Sets the scene only — this photo isn&rsquo;t checked.</figcaption>
                </figure>
              </Reveal>
              <div className={`flex flex-col md:col-span-6 ${flip ? "md:order-1 md:col-start-1" : "md:col-start-7"}`}>
                <p className="font-display text-[3.5rem] font-semibold leading-none tracking-[-0.05em] text-accent">0{i + 1}</p>
                <p className="mt-5 text-sm font-semibold text-accent">{pub.outcome}</p>
                <h2 id={`ex-${d.slug}`} className="t-2 mt-2">{pub.title}</h2>
                <p className="lede mt-4">{d.challenge}</p>

                <dl className="mt-8 grid grid-cols-[8.5rem_1fr] gap-x-4 gap-y-3 border-y border-line py-5 text-[0.975rem]">
                  <dt className="text-muted">Dress code</dt>
                  <dd>{d.details.dress_code || "—"}</dd>
                  <dt className="text-muted">Setting</dt>
                  <dd className="capitalize">{d.details.setting}</dd>
                  <dt className="text-muted">Requests</dt>
                  <dd>{d.details.restrictions || "None stated"}</dd>
                  <dt className="text-muted">Source</dt>
                  <dd>Entered for this example</dd>
                </dl>

                <p className="mt-5 text-ink-2">{d.expected}</p>
                <p className="mt-3 border-l-2 border-accent pl-3 text-[0.95rem] text-ink-2">
                  {photos[i]
                    ? "A permissioned example photo is ready for this example; you can replace it with your own."
                    : "You'll add a photo of your own outfit — no example photo is attached."}
                </p>
                <div className="mt-8">
                  <StartCheckButton demo={d.slug} className="btn btn-primary w-full sm:w-auto">
                    Start this example <ArrowIcon className="nudge size-4" />
                  </StartCheckButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {SHOWCASE.length ? (
        <section aria-labelledby="recorded" className="border-t border-line bg-raised">
          <div className="wrap py-16">
            <p className="eyebrow">Recorded results</p>
            <h2 id="recorded" className="t-2 mt-4">Saved outputs from earlier real runs</h2>
            <p className="mt-3 max-w-2xl text-ink-2">These are recordings of real YouCam tasks, shown with the subject&rsquo;s permission. They are not the result of a fresh call.</p>
            <div className="mt-10 grid gap-12 md:grid-cols-2">
              {SHOWCASE.map((s) => (
                <figure key={s.previewSrc}>
                  <Compare originalUrl={s.originalSrc} previewUrl={s.previewSrc} previewAlt={`AI-generated preview: ${s.change}`} />
                  <figcaption className="mt-2 text-sm text-ink-2">
                    Recorded {s.recordedAt.slice(0, 10)} · {s.requirement} → {s.change}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-line">
        <div className="wrap flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
          <p className="t-3 max-w-[30ch]">Have your own invitation? Start a check from scratch.</p>
          <div className="flex flex-wrap items-center gap-5">
            <StartCheckButton className="btn btn-secondary">Check my outfit</StartCheckButton>
            <Link href="/help" className="btn btn-quiet">Photo guide</Link>
          </div>
        </div>
      </section>
    </>
  );
}
