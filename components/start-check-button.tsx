"use client";

import { useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client";

/**
 * Starts a guest check. A real form POST (works without JavaScript); the server sets the
 * HTTP-only session cookie and redirects to the invitation step.
 */
export function StartCheckButton({ children, className, demo }: { children: React.ReactNode; className?: string; demo?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const requestId = useRef<string | null>(null);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  return (
    <form action="/api/checks" method="post" onSubmit={async (event) => {
      event.preventDefault();
      if (busy || cooldown) return;
      setBusy(true);
      setError(null);
      requestId.current ??= crypto.randomUUID();
      try {
        const result = await api<{ nextPath: string }>("/api/checks", { method: "POST", body: JSON.stringify({ demo, requestId: requestId.current }) });
        window.location.assign(result.nextPath);
      } catch (e) {
        setBusy(false);
        setError(e instanceof ClientApiError ? e.body.message : "Couldn't start a check. Please try again.");
        if (e instanceof ClientApiError && e.body.retryAfter) setCooldown(e.body.retryAfter);
      }
    }} className="contents">
      {demo ? <input type="hidden" name="demo" value={demo} /> : null}
      <button type="submit" className={className} disabled={busy || cooldown > 0} aria-busy={busy}>
        {busy ? "Starting…" : cooldown ? `Try again in ${cooldown}s` : children}
      </button>
      {error ? <span role="alert" className="block max-w-prose text-sm text-bad">{error} <a href="/looks" className="underline">Open saved checks</a></span> : null}
    </form>
  );
}
