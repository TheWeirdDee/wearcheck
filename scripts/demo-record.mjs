// Records the raw footage for the 180-second demo from the deployed app with Playwright, and writes
// timestamps next to each video for scripts/demo-edit.mjs. Everything shown is the real workflow:
//   desktop (1280×720): sample invitation → Gemini reading → confirm → photo + consent → findings →
//     Clothes V4 render → comparison + zoom → second finding → Shoes V3 render → comparison + zoom →
//     choose a result → download the decision card → open the downloaded file →
//     a separate no-change check (manual details) that ends without any render
//   mobile (390×844, same guest session): the shoe preview's comparison controls
// Both checks are deleted afterwards through the product's own delete action. Output stays in private-ops/video/.
//   node scripts/demo-record.mjs [baseUrl] [photo]
import { chromium, devices } from "@playwright/test";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const base = process.argv[2] ?? "https://wearcheck.vercel.app";
const photo = process.argv[3] ?? "private-assets/people/owner-pinstripe-suit.jpg";
const out = "private-ops/video";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync(out, { recursive: true });

const cursor = () => {
  addEventListener("DOMContentLoaded", () => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(26,25,23,.55);border:2px solid #f3eee5;pointer-events:none;left:-40px;top:-40px;transition:transform .12s";
    document.body.appendChild(d);
    addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => (d.style.transform = "scale(.7)"), true);
    addEventListener("mouseup", () => (d.style.transform = ""), true);
  });
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } }, reducedMotion: "no-preference", colorScheme: "light", acceptDownloads: true });
await context.addInitScript(cursor);
const page = await context.newPage();
const t0 = Date.now();
const marks = [];
const facts = {};
const mark = (name) => { marks.push({ name, t: (Date.now() - t0) / 1000 }); console.log(name, marks.at(-1).t.toFixed(1)); };
const hold = (s, p = page) => p.waitForTimeout(s * 1000);
const glide = async (loc, p = page) => { const b = await loc.boundingBox(); if (b) await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 }); };
const click = async (loc, p = page) => { await loc.scrollIntoViewIfNeeded(); await glide(loc, p); await hold(0.3, p); await loc.click(); };
const checks = [];
const idOf = (url) => url.match(/check\/([0-9a-f-]{36})/)[1];
let mobileVideo = null;

async function slideAndZoom(p, prefix) {
  const frame = p.getByTestId("compare-frame");
  const group = p.getByRole("group", { name: "Comparison view" });
  mark(`${prefix}_full`);
  await hold(3);
  mark(`${prefix}_original`);
  await click(group.getByRole("button", { name: "Original" }), p);
  await hold(2.2, p);
  mark(`${prefix}_ai`);
  await click(group.getByRole("button", { name: "AI preview" }), p);
  await hold(2.2, p);
  mark(`${prefix}_compare`);
  await click(group.getByRole("button", { name: "Compare" }), p);
  await hold(0.8, p);
  const b = await frame.boundingBox();
  const y = b.y + b.height * 0.42;
  mark(`${prefix}_slide`);
  await p.mouse.move(b.x + b.width * 0.5, y, { steps: 8 });
  await p.mouse.down();
  await p.mouse.move(b.x + b.width * 0.1, y, { steps: 40 });
  await p.mouse.move(b.x + b.width * 0.9, y, { steps: 70 });
  await p.mouse.move(b.x + b.width * 0.5, y, { steps: 35 });
  await p.mouse.up();
  await hold(0.8, p);
  const zoom = p.getByRole("button", { name: "Zoom to the change" });
  await zoom.waitFor();
  await p.waitForFunction(() => !document.querySelector('button[aria-pressed][title="No clearly changed area was found"]'), null, { timeout: 15_000 }).catch(() => {});
  mark(`${prefix}_zoom`);
  await click(zoom, p);
  await hold(1.2, p);
  await p.mouse.move(b.x + b.width * 0.5, y, { steps: 8 });
  await p.mouse.down();
  await p.mouse.move(b.x + b.width * 0.15, y, { steps: 40 });
  await p.mouse.move(b.x + b.width * 0.85, y, { steps: 60 });
  await p.mouse.move(b.x + b.width * 0.5, y, { steps: 30 });
  await p.mouse.up();
  await hold(2, p);
  mark(`${prefix}_zoom_end`);
  await click(p.getByRole("button", { name: "Show full photo" }), p);
  await hold(1.2, p);
}

// Prefer references whose change is easy to see (DEMO_PREFER, a regex on the title), else the first offered.
const prefer = new RegExp(process.env.DEMO_PREFER ?? "cap-toe oxford|blue cotton", "i");
async function pick() {
  const cards = page.getByTestId("catalogue").locator("li");
  await cards.first().waitFor();
  const liked = cards.filter({ has: page.getByRole("heading", { name: prefer }) });
  return (await liked.count()) ? liked.first() : cards.first();
}

async function generateAndWait(prefix) {
  mark(`${prefix}_generate`);
  await click(page.getByRole("button", { name: "Generate preview" }));
  await page.waitForURL(/\/preview\?job=/, { timeout: 60_000 });
  const job = new URL(page.url()).searchParams.get("job");
  mark(`${prefix}_wait0`);
  await page.getByRole("heading", { name: /Your AI preview|The preview didn't work/ }).waitFor({ timeout: 6 * 60_000 });
  mark(`${prefix}_wait1`);
  if (!(await page.getByRole("heading", { name: "Your AI preview" }).count())) throw new Error(`${prefix} render failed: ${await page.locator("[role=status]").innerText().catch(() => "")}`);
  await page.locator('img[alt^="AI-generated preview"]').first().waitFor();
  // Both comparison images fully decoded before the result is shown.
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="compare-frame"] img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30_000 });
  await hold(1.5);
  facts[`${prefix}_generated`] = await page.getByText(/Generated in \d+s/).innerText().catch(() => null);
  return job;
}

try {
  // ---------- main check: invitation ----------
  await page.goto(base + "/check/new", { waitUntil: "load" });
  await hold(1);
  await click(page.getByRole("button", { name: "Start my check" }));
  await page.waitForURL(/\/invitation$/);
  checks.push(idOf(page.url()));
  mark("inv_start");
  await hold(1.5);
  await page.locator('input[aria-label="Choose invitation image"]').setInputFiles("tests/fixtures/sample-invitation.png");
  await hold(2.5);
  await click(page.getByRole("button", { name: "Continue" }).first());
  mark("inv_wait0");
  await page.waitForURL(/\/requirements$/, { timeout: 150_000 });
  await page.getByText("From invitation").first().waitFor();
  mark("inv_wait1");
  await hold(3);
  await page.mouse.move(700, 420, { steps: 10 });
  await page.mouse.wheel(0, 260);
  await hold(2.5);
  const src = page.getByRole("button", { name: "Show source text" }).first();
  if (await src.count()) { await click(src); await hold(2.5); }
  await page.mouse.wheel(0, 300);
  await hold(2.5);
  mark("req_confirm");
  await click(page.getByRole("button", { name: "These details are correct" }));
  await page.waitForURL(/\/outfit$/);

  // ---------- photo + consent ----------
  mark("outfit_start");
  await hold(1.5);
  await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(photo);
  await hold(2.5);
  mark("consent");
  await click(page.getByRole("checkbox"));
  await hold(2);
  await click(page.getByRole("button", { name: /Continue/ }));
  await page.waitForURL(/\/assessment$/);
  mark("ass_wait0");
  await page.getByText(/Looks compatible|One change worth considering|Potential dress-code conflict|Not enough information|No specific requirements/).first().waitFor({ timeout: 150_000 });
  mark("ass_wait1");
  facts.headline = await page.locator("main p.inline-flex").first().innerText().catch(() => null);
  facts.keyObservation = await page.locator("main h1").first().innerText().catch(() => null);
  facts.keyReason = await page.locator("main p.lede").first().innerText().catch(() => null);
  await hold(3.5);
  const why = page.getByRole("button", { name: /Why\?/ });
  if (await why.count()) { await click(why.first()); await hold(3.5); }
  mark("ass_also");
  await page.mouse.wheel(0, 320);
  await hold(3);
  facts.also = await page.locator("#h-also + ul").innerText().catch(() => null);

  // ---------- first render (primary finding) ----------
  mark("opt1_start");
  await click(page.getByRole("link", { name: "Preview the smallest change" }));
  await page.waitForURL(/\/options$/);
  await hold(2.5);
  const first = await pick();
  facts.item1 = await first.getByRole("heading").innerText();
  await click(first.getByRole("button", { name: /Try this/ }));
  await hold(2.5);
  const job1 = await generateAndWait("r1");
  facts.feature1 = await page.locator("main p.eyebrow").first().innerText().catch(() => null);
  await slideAndZoom(page, "r1");
  mark("r1_end");

  // ---------- second render (the other category, from "Also worth a look") ----------
  await page.goto(`${base}/check/${checks[0]}/assessment`, { waitUntil: "load" });
  await page.locator("#h-also").scrollIntoViewIfNeeded();
  await page.mouse.move(640, 400);
  await hold(0.5);
  mark("ass2_start");
  await hold(2.5);
  // A second finding if there is one; otherwise the optional (clearly labelled) shoe preview.
  const another = page.getByRole("link", { name: "Preview this change" });
  facts.secondKind = (await another.count()) ? "finding" : "optional";
  await click(facts.secondKind === "finding" ? another.first() : page.getByRole("link", { name: "Try different shoes" }));
  await page.waitForURL(/\/options\?/);
  mark("opt2_start");
  await hold(2.5);
  const second = await pick();
  facts.item2 = await second.getByRole("heading").innerText();
  await click(second.getByRole("button", { name: /Try this/ }));
  await hold(2);
  const job2 = await generateAndWait("r2");
  facts.feature2 = await page.locator("main p.eyebrow").first().innerText().catch(() => null);
  await slideAndZoom(page, "r2");
  mark("r2_end");

  // ---------- choose a result, download and open the card ----------
  const chosen = process.env.DEMO_CHOOSE === "2" ? job2 : job1;
  await page.goto(`${base}/check/${checks[0]}/preview?job=${chosen}`, { waitUntil: "load" });
  await hold(1.5);
  mark("choose");
  await click(page.getByRole("button", { name: "Use this look" }));
  await page.waitForURL(/\/decision$/);
  await page.locator('img[alt^="AI-generated preview"]').first().waitFor();
  mark("decision");
  await hold(4);
  const dlP = page.waitForEvent("download");
  mark("download");
  await click(page.getByRole("link", { name: /Download decision card/ }).first());
  const dl = await dlP;
  const cardFile = resolve(out, `card-${stamp}.png`);
  await dl.saveAs(cardFile);
  facts.cardFile = cardFile;
  facts.cardSuggestedName = dl.suggestedFilename();
  await hold(1.5);
  await page.goto(pathToFileURL(cardFile).href);
  mark("card_open");
  await hold(3);
  await page.mouse.move(640, 110, { steps: 10 });
  await page.mouse.click(640, 110); // Chrome's image viewer: zoom to 100%, near the top of the card
  await page.evaluate(() => window.scrollTo(0, 0));
  await hold(1.5);
  mark("card_zoom");
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 90); await hold(0.8); }
  await hold(1.5);
  mark("card_end");

  // ---------- no-change outcome: a separate check, no render ----------
  await page.goto(base + "/check/new", { waitUntil: "load" });
  mark("keep_start");
  await click(page.getByRole("button", { name: "Start my check" }));
  await page.waitForURL(/\/invitation$/);
  checks.push(idOf(page.url()));
  await click(page.getByRole("tab", { name: "Enter details" }));
  await page.getByLabel("Occasion").selectOption("work");
  await hold(0.6);
  await page.getByLabel(/Dress code, as written/).pressSequentially("Smart casual", { delay: 45 });
  await click(page.locator("label", { hasText: /^indoor$/i }));
  await hold(1);
  mark("keep_entered");
  await click(page.getByRole("button", { name: "Continue" }).last());
  await page.waitForURL(/\/requirements$/);
  await hold(1.5);
  await click(page.getByRole("button", { name: "These details are correct" }));
  await page.waitForURL(/\/outfit$/);
  await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(photo);
  await hold(1);
  await click(page.getByRole("checkbox"));
  await click(page.getByRole("button", { name: /Continue/ }));
  await page.waitForURL(/\/assessment$/);
  mark("keep_wait0");
  await page.getByText(/Looks compatible|One change worth considering|Potential dress-code conflict|Not enough information|No specific requirements/).first().waitFor({ timeout: 150_000 });
  mark("keep_wait1");
  facts.keepHeadline = await page.locator("main p.inline-flex").first().innerText().catch(() => null);
  await hold(3);
  const save = page.getByRole("button", { name: "Save my outfit check" });
  if (!(await save.count())) throw new Error(`no-change check was not compatible: ${facts.keepHeadline}`);
  await click(save);
  await page.waitForURL(/\/decision$/);
  mark("keep_decision");
  await hold(4.5);
  mark("keep_end");

  // ---------- mobile: same guest session, the shoe preview ----------
  const state = await context.storageState();
  const mctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: state, recordVideo: { dir: out, size: { width: 390, height: 844 } }, colorScheme: "light" });
  await mctx.addInitScript(cursor);
  const m = await mctx.newPage();
  const mt0 = Date.now();
  const mmarks = [];
  const mm = (name) => { mmarks.push({ name, t: (Date.now() - mt0) / 1000 }); console.log("m", name, mmarks.at(-1).t.toFixed(1)); };
  const mobileJob = process.env.DEMO_CHOOSE === "2" ? job1 : job2;
  await m.goto(`${base}/check/${checks[0]}/preview?job=${mobileJob}`, { waitUntil: "load" });
  await m.getByTestId("compare-frame").waitFor();
  await m.waitForTimeout(1500);
  mm("m_start");
  const mg = m.getByRole("group", { name: "Comparison view" });
  await mg.getByRole("button", { name: "Original" }).tap();
  await m.waitForTimeout(1.6 * 1000);
  await mg.getByRole("button", { name: "AI preview" }).tap();
  await m.waitForTimeout(1.6 * 1000);
  await mg.getByRole("button", { name: "Compare" }).tap();
  await m.waitForTimeout(700);
  const mb = await m.getByTestId("compare-frame").boundingBox();
  const my = mb.y + mb.height * 0.45;
  await m.mouse.move(mb.x + mb.width * 0.5, my);
  await m.mouse.down();
  await m.mouse.move(mb.x + mb.width * 0.12, my, { steps: 30 });
  await m.mouse.move(mb.x + mb.width * 0.88, my, { steps: 45 });
  await m.mouse.move(mb.x + mb.width * 0.5, my, { steps: 25 });
  await m.mouse.up();
  await m.getByRole("button", { name: "Zoom to the change" }).tap();
  await m.waitForTimeout(3000);
  mm("m_end");
  await m.waitForTimeout(1500);
  mobileVideo = { video: m.video(), marks: mmarks };
  await mctx.close();
  facts.jobs = { job1, job2 };
} finally {
  // Remove both demo checks (photos and renders) through the product's own delete action.
  for (const id of checks) {
    const r = await page.request.delete(`${base}/api/checks/${id}`, { headers: { Origin: base } }).catch(() => null);
    console.log("cleanup delete", id, r?.status());
  }
  const video = page.video();
  await context.close();
  await browser.close();
  const record = { base, photo, checks, marks, facts };
  if (video) {
    const p = await video.path();
    renameSync(p, `${out}/raw-${stamp}.webm`);
    record.desktop = `${out}/raw-${stamp}.webm`;
  }
  if (mobileVideo) {
    const p = await mobileVideo.video.path();
    renameSync(p, `${out}/raw-${stamp}-mobile.webm`);
    record.mobile = `${out}/raw-${stamp}-mobile.webm`;
    record.mobileMarks = mobileVideo.marks;
  }
  writeFileSync(`${out}/raw-${stamp}.json`, JSON.stringify(record, null, 2));
  console.log("raw", JSON.stringify({ desktop: record.desktop, mobile: record.mobile }));
}
