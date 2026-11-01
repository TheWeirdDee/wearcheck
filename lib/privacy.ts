import "server-only";
import { db } from "./db";
import { log } from "./log";
import { removeObjects } from "./storage";

/**
 * Deletion and retention — scoped strictly to WearCheck rows (wearcheck schema) and
 * WearCheck objects (checks/<id>/… keys in the wearcheck-private bucket).
 * Provider-side copies (YouCam, Gemini) follow those providers' own policies; we can't delete them.
 */

/** Deletes a check's stored images, then its rows (FK cascades). Usage ledger rows keep only counts. */
export async function deleteCheck(checkId: string) {
  const sql = db();
  const assets = await sql`select storage_key from wearcheck.media_assets where check_id = ${checkId}`;
  const keys = assets.map((a) => a.storage_key as string).filter((k) => k.startsWith(`checks/${checkId}/`));
  // Revoke access first so no route can serve these assets while bytes are being removed.
  await sql`update wearcheck.checks set status = 'deleted', updated_at = now() where id = ${checkId}`;
  await removeObjects(keys);
  await sql`insert into wearcheck.product_events (check_id, event_name) values (null, 'check_deleted')`;
  await sql`delete from wearcheck.checks where id = ${checkId}`;
  return { deletedAssets: keys.length };
}

/**
 * Retention cleanup: removes checks past expires_at (24h guest policy) unless a render job is
 * still active and younger than 1h, then expired guest sessions and old rate-limit rows.
 */
export async function cleanupExpired(limit = 200) {
  const sql = db();
  const expired = await sql`
    select c.id from wearcheck.checks c
    where (c.expires_at < now() or c.status = 'deleted')
      and not exists (
        select 1 from wearcheck.render_jobs j
        where j.check_id = c.id and j.status in ('validating','uploading_source','uploading_reference','submitted','processing','delayed','persisting_result')
          and j.created_at > now() - interval '1 hour')
    order by c.expires_at limit ${limit}`;
  let assets = 0;
  for (const row of expired) {
    try {
      assets += (await deleteCheck(row.id as string)).deletedAssets;
    } catch (e) {
      log.error("cleanup_check_failed", e);
    }
  }
  const sessions = await sql`delete from wearcheck.guest_sessions s where s.expires_at < now() and not exists (select 1 from wearcheck.checks c where c.guest_session_id = s.id) returning id`;
  const rates = await sql`delete from wearcheck.rate_events where created_at < now() - interval '2 days' returning id`;
  return { checks: expired.length, assets, sessions: sessions.length, rateEvents: rates.length };
}
