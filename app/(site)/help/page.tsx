import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DocNav } from "@/components/doc-nav";
import { Faq } from "@/components/faq";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { StartCheckButton } from "@/components/start-check-button";
import { EDITORIAL, type EditorialImage } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "Photo guide & help",
  description: "How to take a photo WearCheck can read, what its findings mean, how previews work, and what to do when something goes wrong.",
};

const SECTIONS = [
  { id: "photos", label: "Taking the photo" },
  { id: "invitation", label: "Adding the invitation" },
  { id: "findings", label: "Reading the findings" },
  { id: "previews", label: "Previews" },
  { id: "downloads", label: "Decision card" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

function Avoid({ img, title, children }: { img: EditorialImage; title: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-photo">
        <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 100vw" className="object-cover" />
        <span className="absolute left-2.5 top-2.5 bg-bad px-2 py-1 text-[0.75rem] font-bold uppercase tracking-[0.08em] text-bg">Avoid</span>
      </div>
      <figcaption className="mt-3">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-[0.95rem] leading-snug text-ink-2">{children}</p>
      </figcaption>
    </figure>
  );
}

const STATES = [
  { tone: "text-ok", t: "Looks compatible with your requirements", d: "Nothing you confirmed conflicts with what is visible. It is not the host's approval." },
  { tone: "text-accent", t: "One change worth considering", d: "A practical point or recommendation — heels on a lawn, say. Not a broken rule." },
  { tone: "text-bad", t: "Potential conflict", d: "Only when an explicit requirement you confirmed clearly contradicts something visible or something you told us." },
  { tone: "text-warn", t: "Not enough information", d: "Something that matters isn't visible, or one question needs your answer first." },
];

export default function HelpPage() {
  return (
    <>
      <header className="wrap pb-10 pt-10 lg:pb-14 lg:pt-16">
        <p className="eyebrow">Help</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h1 className="t-1 max-w-[15ch]">Get a photo WearCheck can read.</h1>
          <p className="lede">A clear photo makes every finding more useful. This guide also explains what the results mean, how previews work and what to do when something fails.</p>
        </div>
      </header>

      <div className="wrap grid gap-10 pb-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:pb-24">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <DocNav sections={SECTIONS} label="On this page" />
          <div className="mt-8 hidden lg:block">
            <StartCheckButton className="btn btn-primary w-full">Check my outfit</StartCheckButton>
          </div>
        </aside>

        <div className="min-w-0 space-y-20 lg:space-y-28">
          <section id="photos" aria-labelledby="photos-h" className="scroll-mt-28">
            <h2 id="photos-h" className="t-2">Taking the photo</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-10">
              <figure>
                <div className="relative aspect-[4/5] overflow-hidden bg-photo">
                  <Image src={EDITORIAL.guideGood.src} alt={EDITORIAL.guideGood.alt} fill sizes="(min-width: 1024px) 40vw, (min-width: 768px) 55vw, 100vw" className="object-cover" />
                  <span className="absolute left-3 top-3 bg-ok px-2 py-1 text-[0.75rem] font-bold uppercase tracking-[0.08em] text-bg">Works well</span>
                </div>
                <figcaption className="photo-credit mt-3">{EDITORIAL.guideGood.credit}</figcaption>
              </figure>
              <div className="flex flex-col justify-center">
                <p className="t-3">What a good photo has</p>
                <ul className="mt-6 divide-y divide-line border-y border-line">
                  {[
                    ["One adult, standing", "Only the person whose outfit you're checking. Uploading means you have their permission."],
                    ["Head to feet in frame", "Feet must be visible for any shoe finding or shoe preview."],
                    ["Facing the camera", "Front or a slight turn. Sitting or crouching hides the outfit."],
                    ["Even daylight, plain background", "Colour requests such as “no ivory” depend on it. Mirrors and busy rooms confuse the models."],
                  ].map(([t, d]) => (
                    <li key={t} className="flex gap-3 py-4">
                      <CheckIcon className="mt-1 size-5 flex-none text-ok" />
                      <div>
                        <p className="font-semibold">{t}</p>
                        <p className="mt-0.5 text-[0.975rem] text-ink-2">{d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <Avoid img={EDITORIAL.guideFeet} title="Feet cut off">Shoes can&rsquo;t be checked or previewed. You&rsquo;ll be asked what you plan to wear.</Avoid>
              <Avoid img={EDITORIAL.guideTwo} title="More than one person">WearCheck can&rsquo;t tell whose outfit to check, and the preview may refuse the photo.</Avoid>
              <Avoid img={EDITORIAL.guideDark} title="Dim or coloured light">Colours become unreliable. Any colour finding will ask you to confirm the shade.</Avoid>
            </div>
            <p className="photo-credit mt-4">The cropped and darkened versions are edits of the same editorial photo, made to show each problem.</p>

            <dl className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
              <div><dt className="font-semibold">Formats</dt><dd className="mt-1 text-ink-2">JPG, PNG or WebP. HEIC works if your browser can open it. PDFs aren&rsquo;t supported — take a screenshot instead.</dd></div>
              <div><dt className="font-semibold">Size</dt><dd className="mt-1 text-ink-2">At least 512 px on the short side; 1,000 px or more works best. Large photos are resized before upload.</dd></div>
              <div><dt className="font-semibold">Privacy</dt><dd className="mt-1 text-ink-2">Location and camera details are stripped when the photo is re-encoded. <Link href="/privacy" className="link">More on privacy</Link>.</dd></div>
            </dl>
          </section>

          <section id="invitation" aria-labelledby="invitation-h" className="scroll-mt-28">
            <h2 id="invitation-h" className="t-2">Adding the invitation</h2>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <p className="text-ink-2">
                Upload a photo or screenshot of the invitation, or type the details yourself. WearCheck reads the text, then shows you a list of requirements to edit and confirm. Nothing is assessed until you confirm.
              </p>
              <p className="text-ink-2">
                Wording such as “dress to impress” or “festive chic” doesn&rsquo;t define particular clothes. WearCheck says it&rsquo;s ambiguous rather than inventing rules, and you can add context such as the venue.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-[0.95rem] text-ink-2">
              <span>Every requirement shows where it came from:</span>
              <span className="chip">From invitation</span>
              <span className="chip">Entered by you</span>
              <span className="chip chip-accent">Suggested — confirm</span>
            </div>
            <p className="mt-4 text-[0.95rem] text-ink-2">
              “From invitation” is used only when the exact words appear in the invitation text. Anything the model inferred stays a suggestion until you approve it.
            </p>
          </section>

          <section id="findings" aria-labelledby="findings-h" className="scroll-mt-28">
            <h2 id="findings-h" className="t-2">Reading the findings</h2>
            <p className="mt-5 max-w-[60ch] text-ink-2">The assessment uses only the requirements you confirmed and what is visible in your photo. Each finding names the requirement behind it; select “Why?” to see the evidence.</p>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {STATES.map((s) => (
                <li key={s.t} className="grid gap-2 py-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8">
                  <p className={`font-display text-xl font-semibold leading-snug ${s.tone}`}>{s.t}</p>
                  <p className="text-ink-2">{s.d}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[0.95rem] text-ink-2">
              WearCheck won&rsquo;t claim certainty about formality, religious or cultural dress, colour in poor light, or whether the host will approve. In those cases it asks you a specific question.
            </p>
          </section>

          <section id="previews" aria-labelledby="previews-h" className="scroll-mt-28">
            <h2 id="previews-h" className="t-2">Previews</h2>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div className="space-y-4 text-ink-2">
                <p>When a change is justified — or if you want to explore — you can choose one alternative: a pair of shoes, a dress or full outfit, a top, or an outer layer. YouCam&rsquo;s virtual try-on renders it onto your photo.</p>
                <p>You can use one of WearCheck&rsquo;s visual references (they&rsquo;re styling references, not shop listings) or upload a photo of an item you own.</p>
              </div>
              <div className="space-y-4 text-ink-2">
                <p>A preview can take a minute or more. You can leave the page and come back; the check remembers it. Each preview uses paid provider credit, so a failed preview is never retried automatically — you choose whether to try again.</p>
                <p><strong className="font-semibold text-ink">A preview isn&rsquo;t proof</strong> of size, fit, fabric, comfort, or how shoes handle grass or gravel, and it may change details such as hands, hair or background.</p>
              </div>
            </div>
          </section>

          <section id="downloads" aria-labelledby="downloads-h" className="scroll-mt-28">
            <h2 id="downloads-h" className="t-2">The decision card</h2>
            <p className="mt-5 max-w-[62ch] text-ink-2">
              Whatever you decide, you can download a card that summarises the event, the requirements, the findings and your decision — including when you keep your outfit unchanged. If you chose a change, it shows the original and the preview side by side. The card is an image file; only people you send it to will see it.
            </p>
          </section>

          <section id="troubleshooting" aria-labelledby="troubleshooting-h" className="scroll-mt-28">
            <h2 id="troubleshooting-h" className="t-2">Troubleshooting</h2>
            <Faq
              className="mt-8"
              items={[
                { q: "My photo was rejected", a: "Photos must be an image (not a PDF), at least 512 px on the short side, and not blank. Try a larger photo, or export it as JPG." },
                { q: "The invitation couldn't be read", a: "The vision service may be busy or at its free-tier limit. Your upload isn't lost — type the details instead, or try again in a few minutes." },
                { q: "The preview is taking a long time", a: "After a few minutes it's marked as delayed but keeps running. You can stop waiting and resume later from the same check. After 20 minutes it's treated as failed." },
                { q: "The preview failed", a: "You'll see the reason — for example the photo shows more than one person, or the feet aren't visible for a shoe preview. Fix the photo or choose another item, then try again when you're ready." },
                { q: "I can't open my check", a: "Checks belong to the browser that created them and expire 24 hours after you start. If it was deleted or has expired, start a new one." },
                { q: "Can it tell me my size, or if shoes will be comfortable?", a: "No. It can't measure fit, sizing, comfort, stability or suitability for terrain." },
              ]}
            />
          </section>

          <div className="flex flex-col items-start gap-5 border-t border-ink pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="t-3">Ready when you are.</p>
            <StartCheckButton className="btn btn-primary">
              Check my outfit <ArrowIcon className="nudge size-4" />
            </StartCheckButton>
          </div>
        </div>
      </div>
    </>
  );
}
