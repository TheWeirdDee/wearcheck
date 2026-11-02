// Retain one guest browser between independent journeys, like ordinary browsing.
// This neither changes quotas nor clears rate records. Isolation tests create separate contexts.
import { request } from "@playwright/test";
import { mkdirSync } from "node:fs";
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3002";
const file = process.env.E2E_STORAGE_STATE ?? "private-ops/release-browser-session.json";
mkdirSync("private-ops", { recursive: true });
const client = await request.newContext({ baseURL, extraHTTPHeaders: { origin: new URL(baseURL).origin } });
try {
  const response = await client.post("/api/checks", { data: { requestId: crypto.randomUUID() }, timeout: 20_000 });
  if (response.status() !== 201) throw new Error(`Session preparation HTTP ${response.status()}; quota was not changed.`);
  const { checkId } = await response.json();
  await client.storageState({ path: file });
  const deletion = await client.delete(`/api/checks/${checkId}`, { timeout: 30_000 });
  if (!deletion.ok()) throw new Error(`Temporary check deletion HTTP ${deletion.status()}`);
  console.log("Guest browser session saved privately; temporary check deleted.");
} finally { await client.dispose(); }
