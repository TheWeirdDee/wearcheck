// Prints the YouCam credit balance for the configured key (never the key itself) and appends it to
// private-ops/youcam-balance.jsonl with a label, so credit use can be measured around real renders.
//   node scripts/youcam-balance.mjs <label>
import { appendFileSync, mkdirSync } from "node:fs";
import { loadEnv } from "./env.mjs";

loadEnv();
const base = process.env.YOUCAM_API_BASE ?? "https://yce-api-01.makeupar.com";
const r = await fetch(`${base}/s2s/v1.0/client/credit`, { headers: { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}` } });
const j = await r.json().catch(() => ({}));
const entries = Array.isArray(j.results) ? j.results : [];
const total = entries.reduce((s, e) => s + Number(e.amount_dec ?? e.amount ?? 0), 0);
const row = { label: process.argv[2] ?? "check", at: new Date().toISOString(), status: r.status, total, entries: entries.map((e) => ({ type: e.type, amount: Number(e.amount_dec ?? e.amount), expiry: e.expiry ? new Date(e.expiry).toISOString().slice(0, 10) : null })) };
mkdirSync("private-ops", { recursive: true });
appendFileSync("private-ops/youcam-balance.jsonl", JSON.stringify(row) + "\n");
console.log(JSON.stringify(row));
