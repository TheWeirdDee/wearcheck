"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { key: "event", label: "Event", segments: ["invitation", "requirements"] },
  { key: "outfit", label: "Outfit", segments: ["outfit"] },
  { key: "check", label: "Check", segments: ["assessment", "options"] },
  { key: "preview", label: "Preview", segments: ["preview", "decision"] },
];

/** Four-step progress line (Event / Outfit / Check / Preview) with the current step emphasised. */
export function WorkflowProgress() {
  const seg = usePathname().split("/").pop() ?? "";
  const current = Math.max(0, STEPS.findIndex((s) => s.segments.includes(seg)));
  return (
    <nav aria-label="Progress" className="border-b border-line">
      <ol className="mx-auto grid max-w-[1320px] grid-cols-4 gap-2 px-4 pb-3 pt-3 sm:px-6 lg:px-10">
        {STEPS.map((s, i) => (
          <li key={s.key} className="min-w-0" aria-current={i === current ? "step" : undefined}>
            <span className={`block h-[3px] ${i <= current ? "bg-ink" : "bg-line"}`} />
            <span className={`mt-2 block truncate text-xs ${i === current ? "font-semibold text-ink" : "text-muted"}`}>
              <span className="sr-only">Step {i + 1} of 4: </span>
              {s.label}
              {i < current ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
