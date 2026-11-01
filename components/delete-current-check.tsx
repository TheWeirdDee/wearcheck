"use client";

import { useState } from "react";
import { TrashIcon } from "./icons";

/** Deletes every check in this browser session (privacy page). Uses the owner cookie; nothing to type. */
export function DeleteCurrentCheck() {
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  const [count, setCount] = useState(0);
  async function run() {
    setState("busy");
    try {
      const res = await fetch("/api/session/checks", { method: "DELETE", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as { deleted: number };
      setCount(j.deleted);
      setState("done");
    } catch {
      setState("error");
    }
  }
  if (state === "done") return <p role="status">{count === 0 ? "There were no checks to delete in this browser." : `Deleted ${count} check${count === 1 ? "" : "s"} and their images.`}</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === "confirm" || state === "busy" ? (
        <>
          <button type="button" className="btn btn-primary" onClick={run} disabled={state === "busy"}>{state === "busy" ? "Deleting…" : "Yes, delete everything"}</button>
          <button type="button" className="btn btn-quiet" onClick={() => setState("idle")}>Cancel</button>
        </>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => setState("confirm")}><TrashIcon /> Delete current check</button>
      )}
      {state === "error" ? <p role="alert" className="text-bad">Deletion failed. Please try again.</p> : null}
    </div>
  );
}
