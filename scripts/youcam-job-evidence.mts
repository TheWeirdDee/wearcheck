// Prints the render jobs and usage-ledger rows for one check (provider task ids truncated) and saves
// each completed result privately to private-ops/youcam-app/result-<job>.jpg. Never commit those files.
//   npx tsx --conditions=react-server scripts/youcam-job-evidence.mts <checkId>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] ??= m[2].trim(); }
const { db } = await import("../lib/db");
const { getObject } = await import("../lib/storage");
const checkId = process.argv[2];
const jobs = await db()`select id, feature, status, provider_task_id, idempotency_key, created_at, submitted_at, completed_at, result_asset_id, error_code from wearcheck.render_jobs where check_id = ${checkId} order by created_at`;
const usage = await db()`select feature, status, units_estimated, latency_ms, provider_task_id, created_at from wearcheck.api_usage_events where check_id = ${checkId} order by created_at`;
mkdirSync("private-ops/youcam-app", { recursive: true });
for (const j of jobs) if (j.result_asset_id) {
  const [a] = await db()`select storage_key from wearcheck.media_assets where id = ${j.result_asset_id}`;
  const o = await getObject(a.storage_key as string);
  writeFileSync(`private-ops/youcam-app/result-${j.id}.jpg`, o);
}
const red = (t: unknown) => (t ? String(t).slice(0, 6) + "…" + String(t).slice(-4) : null);
console.log(JSON.stringify({ jobs: jobs.map((j) => ({ ...j, provider_task_id: red(j.provider_task_id), idempotency_key: undefined })), usage: usage.map((u) => ({ ...u, provider_task_id: red(u.provider_task_id) })), distinctTasks: new Set(jobs.map((j) => j.provider_task_id).filter(Boolean)).size }, null, 1));
await db().end();
