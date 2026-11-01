// End-to-end retention check against the real cleanup endpoint.
// 1. Refuses to run if any check other than labelled test records is already expired, so the cleanup
//    can only remove what this script created.
// 2. Seeds explicitly labelled, already-expired WearCheck test records (demo_case = 'retention-test',
//    media origin 'retention-test', session token prefix 'retention-test:') with stored objects made from
//    the synthetic sample-invitation fixture (no people). Only the wearcheck schema and bucket are used.
// 3. Calls GET <base>/api/cron/cleanup with CRON_SECRET, exactly as the scheduled job does.
// 4. Confirms the rows and the stored objects are gone. Results go to private-ops/retention-test.jsonl.
//   npx tsx --conditions=react-server scripts/retention-test.mts <baseUrl>
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}
const base = process.argv[2] ?? "https://wearcheck.vercel.app";
const { db } = await import("../lib/db");
const { getObject, listPrefix, putObject } = await import("../lib/storage");
const { normalizeImage } = await import("../lib/images");
const sql = db();
const record: Record<string, unknown> = { base, at: new Date().toISOString() };

const [{ others }] = await sql`select count(*)::int as others from wearcheck.checks where expires_at < now() and coalesce(demo_case, '') <> 'retention-test'`;
if (others > 0) {
  console.error(`Refusing: ${others} non-test check(s) are already expired; the cleanup would remove them too.`);
  await sql.end();
  process.exit(1);
}

const img = await normalizeImage(readFileSync("tests/fixtures/sample-invitation.png"), "invitation");
const past = new Date(Date.now() - 2 * 3600_000);
const [session] = await sql`insert into wearcheck.guest_sessions (token_hash, expires_at, last_seen_at) values (${"retention-test:" + randomUUID()}, ${past}, ${past}) returning id`;
const seeded: { checkId: string; keys: string[] }[] = [];
for (let i = 0; i < 2; i++) {
  const [check] = await sql`insert into wearcheck.checks (guest_session_id, demo_case, expires_at, created_at) values (${session.id}, 'retention-test', ${past}, ${past}) returning id`;
  const keys: string[] = [];
  for (const kind of ["invitation", "outfit"] as const) {
    const key = `checks/${check.id}/${kind}/${randomUUID()}.jpg`;
    await putObject(key, img.bytes, "image/jpeg");
    await sql`insert into wearcheck.media_assets (check_id, kind, storage_key, mime, width, height, bytes, sha256, origin, expires_at)
      values (${check.id}, ${kind}, ${key}, 'image/jpeg', ${img.width}, ${img.height}, ${img.bytes.length}, ${createHash("sha256").update(img.bytes).digest("hex")}, 'retention-test', ${past})`;
    keys.push(key);
  }
  seeded.push({ checkId: check.id as string, keys });
}
// Confirm the seeded objects really exist before cleanup.
for (const s of seeded) for (const k of s.keys) await getObject(k);
record.seeded = seeded.map((s) => ({ checkId: s.checkId, objects: s.keys.length }));
console.log("seeded", JSON.stringify(record.seeded), "(objects confirmed present)");

const res = await fetch(`${base}/api/cron/cleanup`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
record.cleanup = { status: res.status, body: await res.json().catch(() => null) };
console.log("cleanup", JSON.stringify(record.cleanup));

const ids = seeded.map((s) => s.checkId);
const [after] = await sql`select
  (select count(*)::int from wearcheck.checks where id = any(${ids})) as checks,
  (select count(*)::int from wearcheck.media_assets where check_id = any(${ids})) as assets,
  (select count(*)::int from wearcheck.guest_sessions where id = ${session.id}) as sessions`;
// Authoritative check: the bucket's object listing (storage metadata) for each seeded folder.
const listed: number[] = [];
for (const s of seeded) for (const k of s.keys) listed.push((await listPrefix(k.slice(0, k.lastIndexOf("/")))).filter((x) => x === k).length);
// Secondary check: downloads. Storage may serve a cached copy briefly after deletion, so poll and record timing.
const downloadable = async () => {
  let n = 0;
  for (const s of seeded) for (const k of s.keys) await getObject(k).then(() => n++, () => {});
  return n;
};
const polls: { secondsAfterCleanup: number; downloadable: number }[] = [];
const t0 = Date.now();
for (let i = 0; i < 10; i++) {
  const n = await downloadable();
  polls.push({ secondsAfterCleanup: Math.round((Date.now() - t0) / 1000), downloadable: n });
  if (n === 0) break;
  await new Promise((r) => setTimeout(r, 30_000));
}
record.after = { ...after, objectsListed: listed.reduce((a, b) => a + b, 0), downloadPolls: polls };
record.verified = after.checks === 0 && after.assets === 0 && after.sessions === 0 && listed.every((n) => n === 0) && polls.at(-1)!.downloadable === 0;
console.log("after", JSON.stringify(record.after), record.verified ? "VERIFIED: records and stored objects removed" : "NOT VERIFIED");
mkdirSync("private-ops", { recursive: true });
appendFileSync("private-ops/retention-test.jsonl", JSON.stringify(record) + "\n");
await sql.end();
process.exit(record.verified ? 0 : 1);
