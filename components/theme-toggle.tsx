"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

type Pref = "light" | "dark" | "system";
const ORDER: Pref[] = ["system", "light", "dark"];
const LABEL: Record<Pref, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

function apply(pref: Pref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme-pref", pref);
}

/** Cycles system → light → dark. The pre-paint script in the root layout prevents any flash. */
export function ThemeToggle() {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    const saved = (document.documentElement.getAttribute("data-theme-pref") as Pref | null) ?? "system";
    // Sync with the value the pre-paint script already applied.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPref(ORDER.includes(saved) ? saved : "system");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((document.documentElement.getAttribute("data-theme-pref") ?? "system") === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={() => {
        setPref(next);
        apply(next);
        try {
          localStorage.setItem("wc-theme", next);
        } catch {
          /* storage unavailable */
        }
      }}
      className="inline-flex size-11 items-center justify-center text-ink hover:bg-sunk"
      aria-label={`${LABEL[pref]} (switch to ${LABEL[next].toLowerCase()})`}
      title={LABEL[pref]}
    >
      {pref === "system" ? <MonitorIcon /> : pref === "light" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
