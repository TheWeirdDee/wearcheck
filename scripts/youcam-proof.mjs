// Gate-0 technical proof: one real YouCam task, end to end, outside the app.
//   node scripts/youcam-proof.mjs <cloth-v4|shoes-transfer> <src.jpg> <ref.jpg> [garment_category]
// Writes the result to private-ops/renders/ and appends a record to private-ops/youcam-runs.jsonl.
// Records task IDs, timestamps, latency and unit balance before/after. Never prints the API key or signed URLs.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { basename, extname } from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();
const [feature, srcPath, refPath, category] = process.argv.slice(2);
if (!["cloth-v4", "shoes-transfer"].includes(feature) || !srcPath || !refPath) {
  console.error("usage: youcam-proof.mjs <cloth-v4|shoes-transfer> <src> <ref> [garment_category]");
  process.exit(2);
}
const base = process.env.YOUCAM_API_BASE;
const auth = { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}` };

async function balance() {
  const r = await fetch(`${base}/s2s/v1.0/client/credit`, { headers: auth });
  const j = await r.json();
  return (j.results ?? []).reduce((s, x) => s + Number(x.amount_dec ?? x.amount ?? 0), 0);
}

async function upload(path) {
  const bytes = readFileSync(path);
  const mime = extname(path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  const r = await fetch(`${base}/s2s/v2.0/file`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ files: [{ content_type: mime, file_name: basename(path), file_size: bytes.length }] }),
  });
  const j = await r.json();
  if (r.status !== 200) throw new Error(`file register ${r.status} ${JSON.stringify(j)}`);
  const f = j.data.files[0];
  const req = Array.isArray(f.requests) ? f.requests[0] : f.requests;
  const put = await fetch(req.url, { method: req.method ?? "PUT", headers: req.headers, body: bytes });
  if (!put.ok) throw new Error(`file PUT ${put.status}`);
  return f.file_id;
}

const record = { feature, category: category ?? null, src: basename(srcPath), ref: basename(refPath), startedAt: new Date().toISOString() };
try {
  record.unitsBefore = await balance();
  const src_file_id = await upload(srcPath);
  const ref_file_id = await upload(refPath);
  const body = feature === "cloth-v4"
    ? { src_file_id, ref_file_id, garment_category: category ?? "full_body", change_shoes: false, filter_multi_person: "normal" }
    : { src_file_id, ref_file_id };
  const t0 = Date.now();
  const cr = await fetch(`${base}/s2s/v2.0/task/${feature}`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const cj = await cr.json();
  record.createStatus = cr.status;
  if (cr.status !== 200) throw new Error(`task create ${cr.status} ${JSON.stringify(cj)}`);
  record.taskId = cj.data.task_id;
  record.submittedAt = new Date().toISOString();
  console.log("submitted", record.taskId);
  let last;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 5000 : 8000));
    const pr = await fetch(`${base}/s2s/v2.0/task/${feature}/${encodeURIComponent(record.taskId)}`, { headers: auth });
    last = await pr.json();
    const st = last?.data?.task_status;
    console.log(`poll ${i} http=${pr.status} status=${st}`);
    if (st === "success" || st === "error") break;
  }
  record.latencyMs = Date.now() - t0;
  record.finalStatus = last?.data?.task_status ?? "timeout";
  record.error = last?.data?.error ?? null;
  record.errorMessage = last?.data?.error_message ?? null;
  record.dataKeys = Object.keys(last?.data ?? {});
  if (record.finalStatus === "success") {
    const url = last.data.results?.url ?? last.data.url;
    const img = await fetch(url);
    const buf = Buffer.from(await img.arrayBuffer());
    mkdirSync("private-ops/renders", { recursive: true });
    const out = `private-ops/renders/${Date.now()}-${feature}.${(img.headers.get("content-type") ?? "").includes("png") ? "png" : "jpg"}`;
    writeFileSync(out, buf);
    record.resultFile = out;
    record.resultBytes = buf.length;
    record.resultContentType = img.headers.get("content-type");
  }
  await new Promise((r) => setTimeout(r, 3000));
  record.unitsAfter = await balance();
  record.unitsConsumed = record.unitsBefore - record.unitsAfter;
} catch (e) {
  record.failure = String(e.message).replace(/https?:\/\/\S+/g, "<url>");
} finally {
  record.finishedAt = new Date().toISOString();
  mkdirSync("private-ops", { recursive: true });
  appendFileSync("private-ops/youcam-runs.jsonl", JSON.stringify(record) + "\n");
  console.log(JSON.stringify(record, null, 2));
}
