"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, CloseIcon, HelpIcon, MenuIcon } from "./icons";
import { Logo } from "./logo";
import { StartCheckButton } from "./start-check-button";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/demo", label: "Examples" },
  { href: "/help", label: "Help" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteHeader({ variant = "site" }: { variant?: "site" | "workflow" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a,button"));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          buttonRef.current?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          buttonRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
        <div className="wrap flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
          <Link href="/" aria-label="WearCheck home" className="-ml-1 p-1">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-[0.95rem] text-ink-2 underline-offset-[6px] hover:text-ink hover:underline aria-[current=page]:text-ink aria-[current=page]:underline"
                aria-current={pathname === n.href ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {variant === "workflow" ? (
              <Link href="/help" className="inline-flex size-11 items-center justify-center hover:bg-sunk md:hidden" aria-label="Photo guide and help">
                <HelpIcon />
              </Link>
            ) : null}
            <ThemeToggle />
            {variant === "site" ? (
              <div className="ml-3 hidden md:block">
                <StartCheckButton className="btn btn-primary btn-sm">Check my outfit</StartCheckButton>
              </div>
            ) : null}
            <button
              ref={buttonRef}
              type="button"
              className="inline-flex size-11 items-center justify-center hover:bg-sunk md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise trap this fixed panel. */}
      {open ? (
        <div id="mobile-menu" ref={panelRef} className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-bg md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <nav aria-label="Mobile" className="wrap flex flex-col pt-4 pb-10">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex items-baseline justify-between border-b border-line py-5 font-display text-[2rem] font-semibold tracking-[-0.03em]">
                {n.label}
                <span className="text-sm font-normal text-muted">0{i + 1}</span>
              </Link>
            ))}
            <div className="mt-10">
              <StartCheckButton className="btn btn-primary w-full">
                Check my outfit <ArrowIcon className="nudge size-4" />
              </StartCheckButton>
            </div>
            <p className="mt-5 text-sm text-muted">No account needed. Your check stays private, locks after 24 hours and is then deleted.</p>
          </nav>
        </div>
      ) : null}
    </>
  );
}
