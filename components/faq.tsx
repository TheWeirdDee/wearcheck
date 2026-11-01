"use client";

import { useId, useState } from "react";

/** Accessible accordion: real buttons with aria-expanded/aria-controls; panels stay in the DOM. */
export function Faq({ items, className = "" }: { items: { q: string; a: React.ReactNode }[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <div className={`border-t border-line ${className}`}>
      {items.map((f, i) => {
        const isOpen = open === i;
        const btn = `${base}-b${i}`;
        const panel = `${base}-p${i}`;
        return (
          <div key={f.q} className="border-b border-line">
            <h3 className="m-0">
              <button
                id={btn}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left font-display text-[1.2rem] font-semibold leading-snug tracking-[-0.015em] sm:text-[1.35rem]"
              >
                <span>{f.q}</span>
                <span aria-hidden className="relative mt-2 block size-4 flex-none">
                  <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                  <span className={`absolute left-1/2 top-0 h-4 w-px bg-current transition-transform duration-300 ${isOpen ? "scale-y-0" : ""}`} />
                </span>
              </button>
            </h3>
            <div id={panel} role="region" aria-labelledby={btn} className="acc-panel" data-open={isOpen} inert={!isOpen}>
              <div>
                <div className="measure pb-7 pr-10 text-[1.02rem] leading-relaxed text-ink-2">{f.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
