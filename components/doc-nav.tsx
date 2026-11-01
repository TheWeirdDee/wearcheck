"use client";

import { useEffect, useState } from "react";

/**
 * Section navigation for long information pages: a sticky list on desktop, a horizontally
 * scrollable row of anchors on small screens (scrolls inside itself, never the page).
 * The current section is tracked with an IntersectionObserver.
 */
export function DocNav({ sections, label }: { sections: { id: string; label: string }[]; label: string }) {
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav aria-label={label}>
      <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-line lg:pb-0">
        {sections.map((s, i) => (
          <li key={s.id} className="flex-none">
            <a
              href={`#${s.id}`}
              aria-current={current === s.id ? "location" : undefined}
              className="inline-flex min-h-11 items-center gap-3 border border-line px-3.5 text-[0.95rem] text-ink-2 hover:text-ink aria-[current=location]:border-ink aria-[current=location]:text-ink lg:-ml-px lg:min-h-0 lg:w-full lg:border-0 lg:border-l-2 lg:border-transparent lg:px-5 lg:py-2.5 lg:aria-[current=location]:border-ink lg:aria-[current=location]:font-semibold"
            >
              <span className="hidden text-sm tabular-nums text-muted lg:inline">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
