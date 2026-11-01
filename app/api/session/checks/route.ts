import { assertSameOrigin, handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { deleteCheck } from "@/lib/privacy";
import { currentGuest } from "@/lib/session";

export const runtime = "nodejs";

/** Deletes all checks owned by the current guest session. */
export const DELETE = handler("session_delete", async (req: Request) => {
  assertSameOrigin(req);
  const guest = await currentGuest();
  if (!guest) return json({ deleted: 0 });
  const rows = await db()`select id from wearcheck.checks where guest_session_id = ${guest.id} and status <> 'deleted'`;
  for (const r of rows) await deleteCheck(r.id as string);
  return json({ deleted: rows.length });
});
