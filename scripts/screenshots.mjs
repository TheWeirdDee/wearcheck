// Captures full-page screenshots of public pages at the required breakpoints and reports
// horizontal overflow, broken images and console errors.
//   node scripts/screenshots.mjs [baseUrl] [outDir] [theme]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "private-ops/screens";
const theme = process.argv[4] ?? "light";
const pages = (process.env.PAGES ?? "/,/demo,/help,/privacy,/check/new").split(",");
const widths = (process.env.WIDTHS ?? "320,375,390,768,1024,1280").split(",").map(Number);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const problems = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme === "dark" ? "dark" : "light", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  for (const p of pages) {
    errors.length = 0;
    const res = await page.goto(base + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    }));
    const name = `${out}/${theme}-${w}${p.replace(/\//g, "_") || "_home"}.png`;
    await page.screenshot({ path: name, fullPage: true });
    if (res?.status() !== 200 || info.overflow > 0 || info.broken.length || errors.length) {
      problems.push({ w, p, status: res?.status(), overflow: info.overflow, broken: info.broken, errors: [...errors] });
    }
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? JSON.stringify(problems, null, 2) : "No overflow, broken images, non-200s or console errors.");
