// Read-only snapshot of the co-tenant app's public tables (row counts) and buckets.
// Used before/after WearCheck migrations to prove the other application was untouched.
import { loadEnv } from "./env.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
loadEnv();
const u = process.env.SUPABASE_URL.replace(/\/$/, ""), k = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: k, Authorization: `Bearer ${k}` };
const spec = await (await fetch(u + "/rest/v1/", { headers: { ...h, Accept: "application/openapi+json" } })).json();
const tables = Object.keys(spec.paths).filter((p) => p !== "/").map((p) => p.slice(1));
const counts = {};
for (const t of tables) {
  const r = await fetch(`${u}/rest/v1/${t}?select=*&limit=0`, { method: "HEAD", headers: { ...h, Prefer: "count=exact" } });
  counts[t] = { status: r.status, count: r.headers.get("content-range")?.split("/")[1] ?? null };
}
const buckets = (await (await fetch(u + "/storage/v1/bucket", { headers: h })).json()).map((b) => ({ id: b.id, public: b.public }));
const snap = { at: new Date().toISOString(), label: process.argv[2] ?? "snapshot", publicTables: counts, buckets };
mkdirSync("private-ops", { recursive: true });
writeFileSync(`private-ops/supabase-${snap.label}.json`, JSON.stringify(snap, null, 2));
console.log(JSON.stringify(snap, null, 2));
