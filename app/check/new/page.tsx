import type { Metadata } from "next";
import Image from "next/image";
import { ArrowIcon } from "@/components/icons";
import { StartCheckButton } from "@/components/start-check-button";
import { EDITORIAL } from "@/lib/editorial";

export const metadata: Metadata = { title: "New check" };

const STEPS = [
  ["The occasion", "Upload the invitation or type the details, then confirm each requirement."],
  ["Your outfit", "One full-length photo of one consenting adult."],
  ["Findings", "Each one names the requirement behind it, or asks you a question."],
  ["Decision", "Keep your outfit, or preview one justified change first."],
];

/** Direct entry point. Creating a check is a POST (no state change on GET). */
export default function NewCheckPage() {
  return (
    <main id="main" className="wrap grid gap-10 py-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-14 lg:py-16 [&>*]:min-w-0">
      <div className="flex flex-col justify-center">
        <p className="eyebrow">New check</p>
        <h1 className="t-1 mt-5 max-w-[14ch]">Start an outfit check.</h1>
        <p className="lede mt-5 max-w-[40ch]">No sign-up. Your check is private to this browser, locks after 24 hours and is deleted by a daily cleanup within the next day.</p>
        <ol className="mt-9 divide-y divide-line border-y border-line">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
              <span className="font-display text-lg font-semibold tabular-nums text-accent">0{i + 1}</span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="block text-[0.975rem] text-ink-2">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-9">
          <StartCheckButton className="btn btn-primary w-full sm:w-auto">
            Start my check <ArrowIcon className="nudge size-4" />
          </StartCheckButton>
        </div>
      </div>
      <figure className="hidden md:block">
        <div className="relative aspect-[4/5] overflow-hidden bg-photo">
          <Image src={EDITORIAL.jumpsuit.src} alt={EDITORIAL.jumpsuit.alt} fill priority sizes="40vw" className="object-cover object-top" />
        </div>
        <figcaption className="photo-credit mt-3">{EDITORIAL.jumpsuit.credit}</figcaption>
      </figure>
    </main>
  );
}
