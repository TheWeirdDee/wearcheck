import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/demo", "/help", "/privacy", "/check/new", "/looks"];

test.describe("public pages", () => {
  for (const path of PAGES) {
    test(`${path} renders without overflow, console errors or serious a11y violations`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      // Scan the settled, static state: mid-fade reveals would otherwise be measured at partial opacity.
      await page.emulateMedia({ reducedMotion: "reduce" });
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

  test("hero states the promise, both actions, and labels its imagery honestly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/An outfit you own\.\s*An occasion to get\s*right\./);
    await expect(page.getByRole("button", { name: "Check my outfit" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "See how it works" })).toBeVisible();
    await expect(page.getByText(/this photo was not assessed/)).toBeVisible();
    // No claims of live execution or verified results on the landing page.
    await expect(page.getByText(/executed live|working examples|verified result/i)).toHaveCount(0);
  });

  test("FAQ rows are buttons that expand and collapse", async ({ page }) => {
    await page.goto("/");
    const q = page.getByRole("button", { name: "Will it always tell me to change something?" });
    await expect(q).toHaveAttribute("aria-expanded", "false");
    await q.click();
    await expect(q).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("region", { name: "Will it always tell me to change something?" })).toContainText("complete result");
    await q.press("Enter");
    await expect(q).toHaveAttribute("aria-expanded", "false");
  });

  test("theme toggle cycles and persists without flash", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
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

  test("comparison (recorded outputs, no provider call): whole frame on screen, toggles, slider and zoom work", async ({ page }) => {
    await page.goto("/demo");
    const frame = page.getByTestId("compare-frame").first();
    await frame.scrollIntoViewIfNeeded();
    await frame.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const box = await frame.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box!.height).toBeLessThanOrEqual(vh); // the full-length photo fits, feet included
    expect(box!.width).toBeGreaterThan(200);
    const group = page.getByRole("group", { name: "Comparison view" }).first();
    await group.getByRole("button", { name: "Original" }).click();
    await expect(group.getByRole("button", { name: "Original" })).toHaveAttribute("aria-pressed", "true");
    await expect(frame.locator('img[alt="Original outfit photo"]')).toBeVisible();
    await group.getByRole("button", { name: "AI preview" }).click();
    await expect(frame.locator('img[alt^="AI-generated preview"]')).toBeVisible();
    await group.getByRole("button", { name: "Compare" }).click();
    const slider = frame.getByRole("slider");
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("0");
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("100");
    const zoom = page.getByRole("button", { name: "Zoom to the change" }).first();
    await expect(zoom).toBeEnabled({ timeout: 10_000 });
    await zoom.click();
    await expect(frame.locator("img").first()).toHaveAttribute("style", /scale\(/);
    const tap = await zoom.boundingBox();
    expect(tap!.height).toBeGreaterThanOrEqual(44); // usable touch target on mobile
  });

  test("private routes are not indexable", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/check\//);
    expect(robots).toMatch(/Disallow: \/api\//);
  });
});

test.describe("how-it-works story", () => {
  test("desktop with motion: section pins and vertical scroll moves the panels sideways, in both directions", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const track = page.getByRole("list", { name: "Steps" });
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const top = await page.locator("#how-it-works").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(400);
    const start = await x();
    await page.mouse.wheel(0, 1400);
    await page.waitForTimeout(1200);
    const mid = await x();
    expect(mid).toBeLessThan(start - 200);
    await expect(page.getByText(/^0[2-4]$/).first()).toBeVisible();
    await page.mouse.wheel(0, -1400);
    await page.waitForTimeout(1200);
    expect(await x()).toBeGreaterThan(mid + 200);
    // Never page-wide sideways overflow, and resizing recalculates without breaking layout.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("reduced motion: no pinning, a swipeable row with working controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const track = page.getByRole("list", { name: "Steps" });
    expect(await track.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await page.getByRole("button", { name: "Next step" }).click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(page.getByRole("button", { name: "Previous step" })).toBeEnabled();
    // Every step's text is in the DOM and readable without animation.
    for (const t of ["The occasion", "Your outfit", "The finding", "The decision"]) await expect(page.getByRole("listitem", { name: new RegExp(t) })).toHaveCount(1);
  });
});
