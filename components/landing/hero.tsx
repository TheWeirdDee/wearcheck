import Image from "next/image";
import Link from "next/link";
import { EDITORIAL } from "@/lib/editorial";
import { ArrowIcon, CheckIcon } from "../icons";
import { StartCheckButton } from "../start-check-button";

/**
 * Image-led hero. The photo is editorial; the notes laid on it show how a check reads
 * (requirement → what's visible → explained result) and are labelled as an illustration.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="wrap grid grid-cols-1 gap-10 pb-14 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:pb-20 lg:pt-10 [&>*]:min-w-0">
        <div className="lg:py-10">
          <p className="eyebrow">Outfit check for a specific occasion</p>
          <h1 className="t-hero mt-6">
            An outfit you own.
            <span className="block text-ink-2">An occasion to get&nbsp;right.</span>
          </h1>
          <p className="lede mt-7 max-w-[34rem]">
            Add the invitation and a photo of your outfit. See what matches the dress code — and preview a change if you need one.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <StartCheckButton className="btn btn-primary w-full sm:w-auto">
              Check my outfit <ArrowIcon className="nudge size-4" />
            </StartCheckButton>
            <Link href="#how-it-works" className="btn btn-secondary w-full sm:w-auto">See how it works</Link>
          </div>
          <p className="mt-7 max-w-[34rem] text-[0.95rem] text-muted">
            No account. Your check is private, locks after 24 hours and is deleted within the next day. If nothing needs changing, that&rsquo;s the answer.
          </p>
        </div>

        <figure className="relative">
          <div className="relative">

            {/* The occasion */}
            <div className="note relative z-10 mx-3 -mb-6 sm:absolute sm:mb-0 sm:left-5 sm:top-5 sm:mx-0 sm:mt-0 sm:w-[16.5rem]">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">The invitation</p>
              <p className="mt-1.5 font-display text-[1.15rem] font-semibold leading-tight">Rooftop supper · Friday, 7 pm</p>
              <p className="mt-1 text-[0.95rem]">Smart casual. <mark className="bg-accent-soft px-0.5 text-ink">No trainers, please.</mark></p>
            </div>

            <div className="relative aspect-[4/5] max-h-[calc(100svh-7rem)] w-full overflow-hidden bg-photo">
              <Image src={EDITORIAL.hero.src} alt={EDITORIAL.hero.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>

            {/* What's visible → the result */}
            <div className="relative z-10 mx-3 mt-3 sm:absolute sm:bottom-5 sm:right-5 sm:mx-0 sm:mt-0 sm:w-[18rem]">
              <div className="note">
                <p className="flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ok">
                  <CheckIcon className="size-4" /> Shoes match
                </p>
                <p className="mt-1.5 text-[0.95rem] leading-snug">Suede ankle boots, not trainers — this fits “No trainers, please.”</p>
                <p className="mt-3 border-t border-line pt-3 font-display text-lg font-semibold leading-tight">Result: keep your outfit.</p>
                <p className="mt-1 text-[0.85rem] leading-snug text-muted">If something didn&rsquo;t match, you could preview one alternative on this photo.</p>
              </div>
            </div>
          </div>
          <figcaption className="photo-credit mt-3 lg:text-right">
            {EDITORIAL.hero.credit}. The notes illustrate how a check reads; this photo was not assessed.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
