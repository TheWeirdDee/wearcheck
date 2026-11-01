// Records the raw demo from the deployed app with Playwright (1280×720) and writes scene/wait
// timestamps next to the video, for scripts/demo-edit.mjs. Runs the real workflow end to end:
// sample invitation → Gemini reading → CC0 public-demo photo → findings → one item → real YouCam
// render → comparison → decision card. Deletes the check afterwards. Output stays in private-ops/video/.
//   node scripts/demo-record.mjs [baseUrl] [photo]
import { chromium } from "@playwright/test";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";

const base = process.argv[2] ?? "https://wearcheck.vercel.app";
const photo = process.argv[3] ?? "private-ops/public-demo/subject-brick-wall.jpg";
const out = "private-ops/video";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } }, reducedMotion: "no-preference", colorScheme: "light" });
// A visible cursor so clicks read on video.
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(26,25,23,.55);border:2px solid #f3eee5;pointer-events:none;left:-40px;top:-40px;transition:transform .12s";
    document.body.appendChild(d);
    addEventListener("mousemove", (e) => { d.style.left = e.clientX + "px"; d.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => (d.style.transform = "scale(.7)"), true);
    addEventListener("mouseup", () => (d.style.transform = ""), true);
  });
});
const page = await context.newPage();
const t0 = Date.now();
const marks = [];
const mark = (name) => { marks.push({ name, t: (Date.now() - t0) / 1000 }); console.log(name, marks.at(-1).t.toFixed(1)); };
const hold = (s) => page.waitForTimeout(s * 1000);
const glide = async (loc) => { const b = await loc.boundingBox(); if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 18 }); };
const click = async (loc) => { await loc.scrollIntoViewIfNeeded(); await glide(loc); await hold(0.3); await loc.click(); };
let checkId = null;

try {
  await page.goto(base + "/", { waitUntil: "networkidle" });
  mark("s1_landing");
  await hold(10);

  mark("s2_story");
  await page.locator("#how-it-works").evaluate((el) => el.scrollIntoView({ behavior: "smooth" }));
  await hold(2.5);
  for (let i = 0; i < 3; i++) { await click(page.getByRole("button", { name: "Next step" })); await hold(2.6); }
  await hold(1.5);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await hold(1);
  await click(page.getByRole("button", { name: "Check my outfit" }).first());
  await page.waitForURL(/\/invitation$/);
  mark("s3_invitation");
  checkId = page.url().match(/check\/([0-9a-f-]{36})/)[1];
  await hold(1.5);
  await page.locator('input[aria-label="Choose invitation image"]').setInputFiles("tests/fixtures/sample-invitation.png");
  await hold(2);
  await click(page.getByRole("button", { name: "Continue" }).first());
  mark("w_gemini_invitation_start");
  await page.waitForURL(/\/requirements$/, { timeout: 120_000 });
  await page.getByText("From invitation").first().waitFor();
  mark("w_gemini_invitation_end");
  await hold(2.5);
  await page.mouse.wheel(0, 420);
  await hold(3);
  await click(page.getByRole("button", { name: "These details are correct" }));
  await page.waitForURL(/\/outfit$/);

  mark("s4_outfit");
  await hold(1.5);
  await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(photo);
  await hold(3);
  await click(page.getByRole("checkbox"));
  await hold(1.5);
  await click(page.getByRole("button", { name: /Continue/ }));
  await page.waitForURL(/\/assessment$/);

  mark("s5_findings");
  mark("w_gemini_outfit_start");
  await page.getByText(/Looks compatible|One change worth considering|Potential dress-code conflict|Not enough information/).first().waitFor({ timeout: 150_000 });
  mark("w_gemini_outfit_end");
  await hold(4);
  const why = page.getByRole("button", { name: /Why\?/ });
  if (await why.count()) { await click(why.first()); await hold(5); }
  await page.mouse.wheel(0, 300);
  await hold(3);

  const primary = page.getByRole("link", { name: /Preview the smallest change|Explore alternatives/ }).first();
  await click(primary);
  await page.waitForURL(/\/options/);
  mark("s6_options");
  await hold(3);
  await click(page.getByRole("button", { name: "Try this" }).first());
  await hold(4);
  await click(page.getByRole("button", { name: "Generate preview" }));
  await page.waitForURL(/\/preview\?job=/, { timeout: 60_000 });

  mark("s7_render");
  mark("w_render_start");
  await page.getByRole("heading", { name: /Your AI preview|The preview didn't work/ }).waitFor({ timeout: 6 * 60_000 });
  mark("w_render_end");
  if (!(await page.getByRole("heading", { name: "Your AI preview" }).count())) throw new Error("render failed");
  await page.locator('img[alt^="AI-generated preview"]').first().waitFor();
  await hold(2.5);
  const slider = page.getByRole("slider");
  const b = await slider.boundingBox();
  if (b) {
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2, { steps: 10 });
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.12, b.y + b.height / 2, { steps: 40 });
    await page.mouse.move(b.x + b.width * 0.88, b.y + b.height / 2, { steps: 60 });
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2, { steps: 30 });
    await page.mouse.up();
  }
  await hold(3);

  await click(page.getByRole("button", { name: "Use this look" }));
  await page.waitForURL(/\/decision$/);
  mark("s8_decision");
  await hold(6);
  await page.locator("#h-card").evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  await hold(6);

  mark("s9_end");
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await hold(9);
  mark("end");
} finally {
  // Remove the demo check (its photo and render) through the product's own delete action.
  if (checkId) {
    const r = await page.request.delete(`${base}/api/checks/${checkId}`, { headers: { Origin: base } });
    console.log("cleanup delete", r.status());
  }
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) {
    const p = await video.path();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    renameSync(p, `${out}/raw-${stamp}.webm`);
    writeFileSync(`${out}/raw-${stamp}.json`, JSON.stringify({ base, photo, checkId, marks }, null, 2));
    console.log("raw video", `${out}/raw-${stamp}.webm`);
  }
}
