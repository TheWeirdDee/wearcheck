import Image from "next/image";
import Link from "next/link";
import { HeroVisual } from "@/components/hero-visual";
import { ArrowIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { StartCheckButton } from "@/components/start-check-button";
import { DEMO_CASES_PUBLIC } from "@/lib/demo-public";

const FAQ = [
  {
    q: "Does WearCheck decide what's appropriate for my event?",
    a: "No. You confirm the event's requirements, and WearCheck only checks your outfit against those. Where wording is vague — “dress to impress”, “festive chic” — it says so instead of inventing rules. Your host's actual instructions always override the app.",
  },
  {
    q: "Will it always tell me to change something?",
    a: "No. “Keep your outfit” is a complete result. If nothing conflicts with your confirmed requirements, you get a decision card without any AI render.",
  },
  {
    q: "What does the AI preview show — and what doesn't it?",
    a: "YouCam's virtual try-on renders one reference item onto your photo so you can see the change. It isn't proof of size, fit, fabric, comfort or how shoes handle the ground, and it can alter details of the photo.",
  },
  {
    q: "What happens to my photos?",
    a: "They're stored privately for this check only and deleted automatically after 24 hours, or immediately when you delete the check. Your photo is sent to Google Gemini to describe the clothing and, only if you request a preview, to YouCam to render it.",
  },
  {
    q: "Do I need an account?",
    a: "No. A private browser session keeps your check for 24 hours. Nothing is published or shared unless you download and send the card yourself.",
  },
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-[1320px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-10 lg:pb-24 lg:pt-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 [&>*]:min-w-0">
          <Reveal>
            <p className="eyebrow">Outfit check for real occasions</p>
            <h1 className="mt-4 text-[2.4rem] font-bold leading-[1.02] sm:text-6xl lg:text-[4.4rem]">Not sure if your outfit fits the dress code?</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
              Show us the invitation and what you&rsquo;re wearing. Keep what works; preview a change only when needed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <StartCheckButton className="btn btn-primary w-full sm:w-auto">Check my outfit</StartCheckButton>
              <Link href="/demo" className="btn btn-quiet self-start">
                See an example <ArrowIcon />
              </Link>
            </div>
            <ul className="mt-10 grid max-w-xl gap-3 border-t border-line pt-6 text-sm text-ink-2 sm:grid-cols-3">
              <li><span className="font-semibold text-ink">For</span> anyone with an invitation and an outfit they already own.</li>
              <li><span className="font-semibold text-ink">When</span> a dress code, colour rule or venue makes you unsure.</li>
              <li><span className="font-semibold text-ink">Why</span> to avoid buying something you don&rsquo;t need.</li>
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* PROBLEM → SOLUTION */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-10 lg:py-24">
          <Reveal>
            <p className="eyebrow">The problem</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Invitations say “no white”, “garden ceremony”, “cocktail”. Your outfit is already hanging up.</h2>
          </Reveal>
          <Reveal delay={0.08} className="space-y-5 text-lg leading-relaxed text-ink-2">
            <p>Most style tools start by showing you things to buy. WearCheck starts with what you planned to wear and the words on your invitation.</p>
            <p>
              It reads the requirements, lets you correct them, looks at your photo, and explains anything that conflicts — with the exact rule it came from. If one item is the problem, you can preview{" "}
              <em>just that item</em> swapped on your own photo with YouCam&rsquo;s virtual try-on.
            </p>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-[1320px] scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Three steps. One decision.</h2>
        </Reveal>
        <ol className="mt-12 grid gap-px border border-line bg-line md:grid-cols-3">
          {[
            { n: "01", t: "Add the invitation", d: "Upload a photo or screenshot, or type the details. You confirm every requirement — exact invitation wording is quoted; anything inferred is marked as a suggestion." },
            { n: "02", t: "Show your outfit", d: "One full-length photo of one consenting adult. Include your feet if you'd like a shoe check. We tell you what we can and can't see." },
            { n: "03", t: "Keep it or try one change", d: "If something conflicts, preview the smallest fix — shoes or one garment — rendered live by YouCam. Download a decision card either way." },
          ].map((s, i) => (
            <li key={s.n} className="bg-bg p-6 sm:p-8">
              <Reveal delay={i * 0.06}>
                <span className="font-display text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-4 text-2xl font-semibold">{s.t}</h3>
                <p className="mt-3 leading-relaxed text-ink-2">{s.d}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* EXAMPLES */}
      <section className="border-y border-line bg-raised">
        <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <p className="eyebrow">Examples you can run</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Three real scenarios, executed live.</h2>
              <p className="mt-4 max-w-xl text-ink-2">Each example uses requirements entered for the example (not a real invitation) and runs the actual pipeline — including a real YouCam render when a change is chosen.</p>
            </Reveal>
            <Link href="/demo" className="btn btn-secondary self-start md:self-auto">Open examples</Link>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {DEMO_CASES_PUBLIC.map((d, i) => (
              <Reveal key={d.slug} delay={i * 0.06}>
                <article className="flex h-full flex-col">
                  <div className="relative aspect-[4/5] overflow-hidden border border-line bg-bg">
                    {d.image ? (
                      <Image src={d.image} alt={d.imageAlt} fill sizes="(min-width: 768px) 30vw, 92vw" className="object-contain p-6" />
                    ) : (
                      <div className="flex h-full flex-col justify-end p-6">
                        <p className="font-display text-4xl font-bold leading-none">Keep what you have.</p>
                        <p className="mt-3 text-sm text-muted">No reference item, no render, no purchase.</p>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 chip bg-bg">{d.tag}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{d.title}</h3>
                  <p className="mt-2 text-ink-2">{d.challenge}</p>
                  {d.imageCredit ? <p className="mt-1 text-sm text-muted">Reference image: {d.imageCredit}</p> : null}
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY & LIMITS */}
      <section className="mx-auto grid max-w-[1320px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.3fr] lg:px-10 lg:py-24">
        <Reveal>
          <p className="eyebrow">Privacy &amp; limits</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Honest about what it can and can&rsquo;t know.</h2>
        </Reveal>
        <dl className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {[
            ["Your photo stays private", "Private storage, owner-only access, deleted after 24 hours or when you choose."],
            ["No account required", "A private browser session holds your check. Nothing is published."],
            ["AI previews aren't proof of fit", "Rendered images can't show size, comfort, fabric or how heels handle grass."],
            ["You're the authority", "Formality and etiquette vary. WearCheck asks rather than guessing."],
          ].map(([t, d]) => (
            <div key={t} className="bg-bg p-6">
              <dt className="font-semibold">{t}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* FAQ */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.3fr] lg:px-10 lg:py-24">
          <Reveal>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Before you start</h2>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="mt-1 text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-ink text-bg">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center lg:px-10 lg:py-20">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">Check the outfit you already have.</h2>
          <StartCheckButton className="btn w-full border border-bg bg-bg text-ink hover:bg-transparent hover:text-bg md:w-auto">Check my outfit</StartCheckButton>
        </div>
      </section>
    </>
  );
}
