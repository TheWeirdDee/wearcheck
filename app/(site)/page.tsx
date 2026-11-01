import Image from "next/image";
import Link from "next/link";
import { Faq } from "@/components/faq";
import { ArrowIcon } from "@/components/icons";
import { Hero } from "@/components/landing/hero";
import { Story } from "@/components/landing/story";
import { Reveal } from "@/components/reveal";
import { StartCheckButton } from "@/components/start-check-button";
import { Compare } from "@/components/workflow/compare";
import { DEMO_CASES_PUBLIC } from "@/lib/demo-public";
import { EDITORIAL } from "@/lib/editorial";
import { SHOWCASE } from "@/lib/showcase";

const FAQ = [
  {
    q: "Does WearCheck decide what's appropriate for my event?",
    a: "No. You confirm the event's requirements, and WearCheck checks your outfit against those. Where wording is vague — “dress to impress”, “festive chic” — it tells you so instead of inventing rules. Your host's instructions always come first.",
  },
  {
    q: "Will it always tell me to change something?",
    a: "No. “Keep your outfit” is a complete result. If nothing conflicts with your confirmed requirements, you get a decision card and no AI preview is made.",
  },
  {
    q: "What does the preview show — and what doesn't it?",
    a: "YouCam's virtual try-on renders one chosen item onto your photo so you can judge the idea of the change. It can't show size, fit, fabric, comfort or how shoes cope with grass or gravel, and it can alter details such as hands, hair or the background.",
  },
  {
    q: "What happens to my photos?",
    a: (
      <>
        They&rsquo;re kept in private storage for this check and deleted automatically within about a day of it expiring 24 hours after you start, or straight away when you delete the check. Google Gemini reads them to describe the clothing; YouCam receives your photo only if you ask for a preview. The{" "}
        <Link href="/privacy" className="link">privacy page</Link> has the details.
      </>
    ),
  },
  {
    q: "Do I need an account?",
    a: "No. A private browser session keeps your check for 24 hours. Nothing is published or shared unless you download the card and send it yourself.",
  },
];

const QUOTES = ["“Black tie optional.”", "“Garden ceremony — the lawn may be soft.”", "“Please avoid white or ivory.”"];

export default function Home() {
  return (
    <>
      <Hero />

      {/* THE PROBLEM */}
      <section aria-labelledby="problem-title" className="border-t border-line">
        <div className="wrap grid grid-cols-1 gap-10 py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14 lg:py-28 [&>*]:min-w-0">
          <Reveal className="order-2 md:order-1">
            <figure>
              <div className="img-reveal img-zoom relative aspect-[2/3] max-h-[44rem] overflow-hidden bg-photo">
                <Image src={EDITORIAL.evening.src} alt={EDITORIAL.evening.alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
              </div>
              <figcaption className="photo-credit mt-3">{EDITORIAL.evening.credit}</figcaption>
            </figure>
          </Reveal>
          <div className="order-1 flex flex-col justify-center md:order-2">
            <Reveal>
              <p className="eyebrow">The problem</p>
              <h2 id="problem-title" className="sr-only">The problem: invitation wording raises questions about clothes you already own</h2>
              <ul className="mt-8 space-y-3" aria-label="Typical invitation wording">
                {QUOTES.map((q) => (
                  <li key={q} className="t-1 even:text-muted">{q}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="lede mt-10 max-w-[38rem]">
                You already have something in mind for the day. The real question is whether it works for <em>this</em> event — and if not, what the smallest fix would be. Shopping apps start by selling you something new. WearCheck starts with what you own.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* THE RESPONSE */}
      <section aria-labelledby="response-title" className="bg-ink text-bg">
        <div className="wrap py-16 lg:py-24">
          <Reveal>
            <h2 id="response-title" className="t-1 max-w-[18ch]">Check what you own. Change only what&rsquo;s justified.</h2>
          </Reveal>
          <ol className="mt-12 grid gap-10 border-t border-bg/25 pt-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-bg/25">
            {[
              ["Your requirements, confirmed by you", "WearCheck reads the invitation, quotes its exact words and marks anything it infers. Nothing is judged until you've confirmed the list."],
              ["Findings with a reason", "Each finding points to the requirement it comes from. If the photo can't show something, you're asked — not guessed at."],
              ["One change, only if it helps", "Keeping your outfit is a full result. When one item conflicts, you can preview a single alternative on your own photo."],
            ].map(([t, d], i) => (
              <li key={t} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <Reveal delay={i * 0.06}>
                  <p className="font-display text-sm font-semibold tabular-nums text-bg/70">0{i + 1}</p>
                  <h3 className="t-3 mt-3">{t}</h3>
                  <p className="mt-3 leading-relaxed text-bg/80">{d}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Story />

      {/* EXAMPLES */}
      <section aria-labelledby="examples-title">
        <div className="wrap py-16 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <p className="eyebrow">Examples</p>
              <h2 id="examples-title" className="t-1 mt-4 max-w-[16ch]">Three occasions to try it on.</h2>
            </Reveal>
            <Reveal delay={0.05} className="max-w-md">
              <p className="text-ink-2">
                Each example opens a new private check with the event requirements filled in for you — they&rsquo;re example details, not a real invitation. You add a photo of your outfit; the check then runs as usual.
              </p>
              <Link href="/demo" className="btn btn-quiet mt-3">
                All example details <ArrowIcon className="nudge size-4" />
              </Link>
            </Reveal>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-12">
            {DEMO_CASES_PUBLIC.map((d, i) => (
              <Reveal key={d.slug} delay={i * 0.06} className={i === 0 ? "md:col-span-6" : i === 1 ? "md:col-span-3 md:mt-24" : "md:col-span-3 md:mt-48"}>
                <article>
                  <div className="img-reveal img-zoom relative aspect-[4/5] overflow-hidden bg-photo">
                    <Image src={d.image.src} alt={d.image.alt} fill sizes={i === 0 ? "(min-width: 768px) 48vw, 100vw" : "(min-width: 768px) 24vw, 100vw"} className="object-cover" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-accent">{d.outcome}</p>
                  <h3 className="t-3 mt-1.5">{d.title}</h3>
                  <p className="mt-2 text-ink-2">{d.challenge}</p>
                  <p className="photo-credit mt-2">{d.image.credit}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* RECORDED COMPARISON — only rendered when a real, permissioned YouCam output exists */}
      {SHOWCASE.length ? (
        <section aria-labelledby="compare-title" className="border-t border-line bg-raised">
          <div className="wrap grid gap-10 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:py-24 [&>*]:min-w-0">
            <div>
              <p className="eyebrow">Recorded result</p>
              <h2 id="compare-title" className="t-2 mt-4">Original and preview, side by side.</h2>
              <p className="mt-4 text-ink-2">
                {SHOWCASE[0].requirement}: {SHOWCASE[0].change}. A saved output from a real YouCam {SHOWCASE[0].feature === "Shoes V3" ? "shoe" : "garment"} preview, generated through WearCheck on {SHOWCASE[0].recordedAt.slice(0, 10)} in {SHOWCASE[0].latencySeconds} seconds. It is a recording, not a fresh call.
              </p>
              <p className="photo-credit mt-4">{SHOWCASE[0].permission}</p>
              <Link href="/demo#recorded" className="btn btn-quiet mt-4">More recorded results <ArrowIcon className="nudge size-4" /></Link>
            </div>
            <Compare originalUrl={SHOWCASE[0].originalSrc} previewUrl={SHOWCASE[0].previewSrc} previewAlt={`AI-generated preview: ${SHOWCASE[0].change}`} />
          </div>
        </section>
      ) : null}

      {/* PRIVACY & LIMITS */}
      <section aria-labelledby="privacy-title" className="border-t border-line bg-raised">
        <div className="wrap grid gap-12 py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-24 [&>*]:min-w-0">
          <Reveal>
            <p className="eyebrow">Privacy &amp; limits</p>
            <h2 id="privacy-title" className="t-2 mt-4 max-w-[16ch]">Clear about what it keeps, and what it can&rsquo;t know.</h2>
            <Link href="/privacy" className="btn btn-secondary mt-8">Read the privacy details</Link>
          </Reveal>
          <div className="grid gap-10 sm:grid-cols-2">
            <Reveal>
              <h3 className="font-display text-lg font-semibold">Your photos</h3>
              <ul className="mt-4 space-y-3 border-t border-line pt-4 text-ink-2">
                <li>Stored privately and shown only to the browser that uploaded them.</li>
                <li>Deleted when you delete the check, or automatically after it expires.</li>
                <li>Read by Google Gemini to describe clothing; sent to YouCam only when you ask for a preview.</li>
              </ul>
            </Reveal>
            <Reveal delay={0.06}>
              <h3 className="font-display text-lg font-semibold">Its limits</h3>
              <ul className="mt-4 space-y-3 border-t border-line pt-4 text-ink-2">
                <li>It isn&rsquo;t the host&rsquo;s approval. Their instructions win.</li>
                <li>It won&rsquo;t judge etiquette, religious dress or formality it can&rsquo;t verify — it asks.</li>
                <li>Previews don&rsquo;t prove fit, size, comfort, or how shoes handle the ground.</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="border-t border-line">
        <div className="wrap grid gap-10 py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-24 [&>*]:min-w-0">
          <Reveal>
            <p className="eyebrow">Questions</p>
            <h2 id="faq-title" className="t-2 mt-4">Before you start</h2>
            <p className="mt-4 text-ink-2">
              More on photos and findings in the <Link href="/help" className="link">help guide</Link>.
            </p>
          </Reveal>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* CLOSING */}
      <section aria-labelledby="closing-title" className="relative overflow-hidden bg-photo">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[38rem]">
            <Image src={EDITORIAL.whiteWall.src} alt={EDITORIAL.whiteWall.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            <p className="absolute bottom-3 left-3 bg-bg/85 px-2 py-1 text-[0.8125rem] text-ink-2">{EDITORIAL.whiteWall.credit}</p>
          </div>
          <div className="flex flex-col justify-center bg-stone px-[clamp(1rem,4vw,3.5rem)] py-16 md:py-20">
            <h2 id="closing-title" className="t-1 max-w-[14ch]">Check the outfit you already have.</h2>
            <p className="lede mt-6 max-w-[30rem]">The invitation, one photo and a few minutes. Keep it, or see one change before you decide.</p>
            <div className="mt-9">
              <StartCheckButton className="btn btn-primary w-full sm:w-auto">
                Check my outfit <ArrowIcon className="nudge size-4" />
              </StartCheckButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
