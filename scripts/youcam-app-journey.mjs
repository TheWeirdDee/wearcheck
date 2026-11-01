// Runs one real YouCam render through the WearCheck UI (not the API directly):
// example → permissioned photo + consent → real Gemini findings → choose one reference item →
// Generate → reload mid-task (recovery) → wait for the result → confirm the AI image is displayed.
// Writes private screenshots and a JSON summary to private-ops/youcam-app/. Never logs the photo.
//   node scripts/youcam-app-journey.mjs <baseUrl> <photo> <exampleIndex 0-2> <itemTitleRegex> <label> [clarificationAnswer]
// If the assessment asks a question, pass the truthful answer (e.g. "white"); the script never guesses.
// Only use photos whose subject has given permission. Results stay private.
import { chromium } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";

const [base, photo, exampleIndex, itemPattern, label, answer] = process.argv.slice(2);
if (!base || !photo || !itemPattern || !label) {
  console.error("usage: youcam-app-journey.mjs <baseUrl> <photo> <exampleIndex> <itemTitleRegex> <label>");
  process.exit(2);
}
const out = "private-ops/youcam-app";
mkdirSync(out, { recursive: true });
const t = { start: new Date().toISOString() };
const summary = { label, base, item: itemPattern, steps: [] };
const step = (name, extra = {}) => { const s = { name, at: new Date().toISOString(), ...extra }; summary.steps.push(s); console.log(JSON.stringify(s)); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
try {
  await page.goto(base + "/demo");
  await page.getByRole("button", { name: "Start this example" }).nth(Number(exampleIndex)).click();
  await page.waitForURL(/\/requirements$/);
  summary.checkId = page.url().match(/check\/([0-9a-f-]{36})/)[1];
  await page.getByRole("button", { name: "These details are correct" }).click();
  await page.waitForURL(/\/outfit$/);
  await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(photo);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForURL(/\/assessment$/);
  step("photo_uploaded");

  const verdict = page.getByText(/Looks compatible|One change worth considering|Potential|Not enough information/).first();
  await verdict.waitFor({ timeout: 120_000 });
  if (await page.getByText("One question first").count()) {
    const question = (await page.locator("fieldset p").first().textContent())?.trim();
    if (!answer) throw new Error(`Assessment asked "${question}" — rerun with the truthful answer as the last argument`);
    step("clarification", { question, answer });
    await page.getByRole("button", { name: answer, exact: true }).click();
    await page.getByText("One question first").waitFor({ state: "detached", timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  step("assessment", { headline: (await page.getByText(/Looks compatible|One change worth considering|Potential|Not enough information/).first().textContent())?.trim() });
  await page.screenshot({ path: `${out}/${label}-assessment.png`, fullPage: true });

  await page.getByRole("link", { name: /Preview the smallest change|Explore alternatives/ }).first().click();
  await page.waitForURL(/\/options/);
  let card = page.locator("li", { has: page.getByRole("heading", { name: new RegExp(itemPattern, "i") }) }).first();
  if (!(await card.count())) {
    // The finding's own options don't include this item; use the optional "explore alternatives" list instead.
    step("item_not_in_finding_options", { url: new URL(page.url()).pathname });
    await page.goto(`${base}/check/${summary.checkId}/options?explore=1`);
    card = page.locator("li", { has: page.getByRole("heading", { name: new RegExp(itemPattern, "i") }) }).first();
  }
  await card.getByRole("button", { name: /Try this|Selected/ }).click();
  await page.getByRole("button", { name: "Generate preview" }).click();
  await page.waitForURL(/\/preview\?job=/, { timeout: 60_000 });
  summary.jobId = new URL(page.url()).searchParams.get("job");
  step("submitted", { jobId: summary.jobId });

  await page.waitForTimeout(4000);
  await page.reload();
  const sameJob = new URL(page.url()).searchParams.get("job") === summary.jobId;
  step("reloaded_mid_task", { sameJob, heading: (await page.getByRole("heading", { level: 1 }).textContent())?.trim() });

  const done = page.getByRole("heading", { name: /Your AI preview|The preview didn't work/ });
  await done.waitFor({ timeout: 6 * 60_000 });
  const ok = (await done.textContent()).includes("Your AI preview");
  if (ok) {
    const img = page.locator('img[alt^="AI-generated preview"]').first();
    await img.waitFor();
    await page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await img.elementHandle(), { timeout: 30_000 });
    const dims = await img.evaluate((el) => `${el.naturalWidth}x${el.naturalHeight}`);
    step("completed_and_displayed", { image: dims, status: (await page.getByText(/Generated in \d+s/).textContent().catch(() => null))?.trim() });
  } else {
    step("failed", { message: (await page.getByRole("status").first().textContent())?.trim() });
  }
  await page.screenshot({ path: `${out}/${label}-preview.png`, fullPage: true });
  summary.ok = ok;
} catch (e) {
  summary.ok = false;
  summary.error = String(e?.message ?? e).split("\n")[0];
  await page.screenshot({ path: `${out}/${label}-error.png`, fullPage: true }).catch(() => {});
  console.error("journey error:", summary.error);
} finally {
  summary.end = new Date().toISOString();
  summary.start = t.start;
  appendFileSync(`${out}/journeys.jsonl`, JSON.stringify(summary) + "\n");
  await browser.close();
}
console.log(summary.ok ? "OK" : "NOT OK", summary.checkId, summary.jobId);
