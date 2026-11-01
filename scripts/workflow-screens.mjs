// Walks one check through the real workflow (Gemini observation, no YouCam render), screenshots every
// screen at 1440 and 390px into private-ops/screens-wf, downloads the decision card, then deletes the
// check and confirms it can no longer be opened. Needs the dev server on :3001.
//   node scripts/workflow-screens.mjs <photo>   (use a permissioned photo; never commit it)
import { chromium } from "@playwright/test";
const base = "http://localhost:3001", out = "private-ops/screens-wf";
const photo = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const shot = async (name) => {
  for (const [w, h] of [[1440, 1000], [390, 860]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
    console.log(name, w, "overflow", ov);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
};
await page.goto(base + "/demo");
await page.getByRole("button", { name: "Start this example" }).nth(1).click();
await page.waitForURL(/\/requirements$/);
await shot("requirements");
await page.getByRole("button", { name: "These details are correct" }).click();
await page.waitForURL(/\/outfit$/);
await shot("outfit-empty");
await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(photo);
await page.getByRole("checkbox").waitFor();
await shot("outfit-selected");
await page.getByRole("checkbox").check();
await page.getByRole("button", { name: /Continue/ }).click();
await page.waitForURL(/\/assessment$/);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/assessment-running-1440.png` });
await page.getByText(/Looks compatible|One change worth considering|Potential|Not enough information/).first().waitFor({ timeout: 120000 });
await shot("assessment");
const opts = page.getByRole("link", { name: /Preview the smallest change|Explore alternatives/ });
if (await opts.count()) { await opts.first().click(); await page.waitForURL(/\/options/); await shot("options"); await page.goBack(); await page.waitForURL(/\/assessment$/); }
const keep = page.getByRole("button", { name: /Save my outfit check|Keep this outfit/ });
if (await keep.isEnabled().catch(() => false)) { await keep.click(); await page.waitForURL(/\/decision$/); await page.waitForTimeout(3000); await shot("decision");
  const id = page.url().match(/check\/([0-9a-f-]{36})/)[1];
  const card = await page.request.get(`${base}/api/checks/${id}/decision-card`);
  console.log("card", card.status(), card.headers()["content-type"], (await card.body()).length);
  (await import("node:fs")).writeFileSync(`${out}/card.png`, await card.body());
}
const id = page.url().match(/check\/([0-9a-f-]{36})/)?.[1];
console.log("check", id);
await page.getByRole("button", { name: "Delete this check" }).first().click();
await page.getByRole("button", { name: "Delete", exact: true }).first().click();
await page.waitForURL(/deleted=1/);
const after = await page.goto(`${base}/check/${id}/assessment`);
console.log("after delete:", after.status(), await page.getByRole("heading", { level: 1 }).textContent());
await b.close();
