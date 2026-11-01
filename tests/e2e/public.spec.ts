import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/demo", "/help", "/privacy", "/check/new"];

test.describe("public pages", () => {
  for (const path of PAGES) {
    test(`${path} renders without overflow, console errors or serious a11y violations`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length);
      expect(broken).toBe(0);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test("landing explains who, what, why, when and how above the fold", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not sure if your outfit fits the dress code?");
    await expect(page.getByRole("button", { name: "Check my outfit" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /See an example/ })).toBeVisible();
    await expect(page.getByText(/Illustration of how a check works|Recorded example/)).toBeVisible();
  });

  test("theme toggle cycles and persists without flash", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: /theme/i });
    await toggle.click(); // system → light
    await expect(html).toHaveAttribute("data-theme", "light");
    await toggle.click(); // light → dark
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.reload();
    // Pre-paint script applies the saved theme before hydration.
    await expect(html).toHaveAttribute("data-theme", "dark");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2aa"]).include("main").analyze();
    expect(axe.violations.filter((v) => v.id === "color-contrast").map((v) => v.nodes.length)).toEqual([]);
  });

  test("mobile menu is icon-only, labelled, keyboard operable and closes on Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const btn = page.getByRole("button", { name: "Open menu" });
    await expect(btn).toBeVisible();
    await btn.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "How it works" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("private routes are not indexable", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/check\//);
    expect(robots).toMatch(/Disallow: \/api\//);
  });
});
