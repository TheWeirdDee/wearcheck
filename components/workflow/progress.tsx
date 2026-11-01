"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { key: "event", label: "Occasion", segments: ["invitation", "requirements"] },
  { key: "outfit", label: "Outfit", segments: ["outfit"] },
  { key: "check", label: "Findings", segments: ["assessment", "options"] },
  { key: "preview", label: "Decision", segments: ["preview", "decision"] },
];

/** Four-step progress line (Occasion / Outfit / Findings / Decision) with the current step emphasised. */
export function WorkflowProgress() {
  const seg = usePathname().split("/").pop() ?? "";
  const current = Math.max(0, STEPS.findIndex((s) => s.segments.includes(seg)));
  return (
    <nav aria-label="Progress" className="border-b border-line bg-raised">
      <ol className="wrap grid grid-cols-4 gap-2 py-3 sm:gap-4">
        {STEPS.map((s, i) => (
          <li key={s.key} className="min-w-0" aria-current={i === current ? "step" : undefined}>
            <span className={`block h-0.5 transition-colors ${i <= current ? "bg-ink" : "bg-line"}`} />
            <span className={`mt-2 flex items-baseline gap-1.5 truncate text-[0.875rem] ${i === current ? "font-semibold text-ink" : i < current ? "text-ink-2" : "text-muted"}`}>
              <span className="hidden tabular-nums sm:inline">{String(i + 1).padStart(2, "0")}</span>
              <span className="sr-only">Step {i + 1} of 4: </span>
              <span className="truncate">{s.label}</span>
              {i < current ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
