"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, HelpIcon, MenuIcon } from "./icons";
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
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-10">
        <Link href="/" className="font-display text-[1.15rem] font-bold tracking-tight sm:text-xl" aria-label="WearCheck home">
          WearCheck
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline" aria-current={pathname === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {variant === "workflow" ? (
            <Link href="/help" className="inline-flex size-11 items-center justify-center hover:bg-sunk md:hidden" aria-label="How it works and photo help">
              <HelpIcon />
            </Link>
          ) : null}
          <ThemeToggle />
          {variant === "site" ? (
            <div className="ml-2 hidden md:block">
              <StartCheckButton className="btn btn-primary min-h-10 px-4 text-sm">Check my outfit</StartCheckButton>
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

      {open ? (
        <div id="mobile-menu" ref={panelRef} className="fixed inset-x-0 top-14 bottom-0 z-50 overflow-y-auto bg-bg md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <nav aria-label="Mobile" className="flex flex-col px-4 py-4">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-4 font-display text-2xl font-semibold">
                {n.label}
              </Link>
            ))}
            <div className="mt-8">
              <StartCheckButton className="btn btn-primary w-full">Check my outfit</StartCheckButton>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
