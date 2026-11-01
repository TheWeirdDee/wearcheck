import type { Metadata } from "next";
import Link from "next/link";
import { StartCheckButton } from "@/components/start-check-button";
import { db } from "@/lib/db";
import { currentGuest } from "@/lib/session";

export const metadata: Metadata = { title: "Your checks", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Guests see only checks from their current browser session. No accounts or cross-device history. */
export default async function LooksPage() {
  const guest = await currentGuest().catch(() => null);
  const rows = guest
    ? await db()`select id, current_step, decision, created_at, expires_at from wearcheck.checks where guest_session_id = ${guest.id} and status <> 'deleted' and expires_at > now() order by created_at desc limit 20`
    : [];
  return (
    <div className="mx-auto max-w-[900px] px-4 pt-10 sm:px-6 lg:pt-16">
      <p className="eyebrow">This browser</p>
      <h1 className="mt-3 text-4xl font-bold">Your checks</h1>
      <p className="mt-3 text-ink-2">Checks stay in this browser session for 24 hours. There&rsquo;s no account or cross-device history.</p>
      {rows.length === 0 ? (
        <div className="mt-10 border border-line p-6">
          <p>No checks in this session.</p>
          <div className="mt-4"><StartCheckButton className="btn btn-primary">Check my outfit</StartCheckButton></div>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.id as string} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{r.decision === "keep" ? "Kept outfit" : r.decision === "change" ? "Chose a change" : `In progress · ${r.current_step}`}</p>
                <p className="text-sm text-muted">Started {new Date(r.created_at as Date).toUTCString().slice(0, 22)} UTC</p>
              </div>
              <Link href={`/check/${r.id}/${r.decision ? "decision" : r.current_step}`} className="btn btn-secondary min-h-10 px-4 text-sm">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
