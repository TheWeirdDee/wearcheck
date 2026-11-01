"use client";

import { useState } from "react";

/**
 * Starts a guest check. A real form POST (works without JavaScript); the server sets the
 * HTTP-only session cookie and redirects to the invitation step.
 */
export function StartCheckButton({ children, className, demo }: { children: React.ReactNode; className?: string; demo?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form action="/api/checks" method="post" onSubmit={() => setBusy(true)} className="contents">
      {demo ? <input type="hidden" name="demo" value={demo} /> : null}
      <button type="submit" className={className} disabled={busy} aria-busy={busy}>
        {busy ? "Starting…" : children}
      </button>
    </form>
  );
}
