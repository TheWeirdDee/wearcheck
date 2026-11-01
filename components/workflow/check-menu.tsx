"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrashIcon } from "../icons";

/** "Delete this check" — always reachable from the workflow. */
export function CheckMenu({ checkId, compact = false }: { checkId: string; compact?: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/checks/${checkId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.replace("/?deleted=1");
    } catch {
      setError("Couldn't delete. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "flex justify-end" : ""}>
      {confirm ? (
        <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Confirm deletion">
          <span>Delete photos, results and this check?</span>
          <button type="button" className="btn btn-primary min-h-9 px-3 text-sm" onClick={del} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
          <button type="button" className="btn btn-quiet min-h-9 text-sm" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="inline-flex min-h-9 items-center gap-2 text-sm text-ink-2 underline-offset-4 hover:underline">
          <TrashIcon /> Delete this check
        </button>
      )}
      {error ? <p role="alert" className="mt-2 text-sm text-bad">{error}</p> : null}
    </div>
  );
}
