import { expect, test } from "@playwright/test";

test("creation cooldown stays in the page, counts down, and retries the same request", async ({ page }) => {
  let attempts = 0;
  const ids: string[] = [];
  await page.route("**/api/checks", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    ids.push(route.request().postDataJSON().requestId);
    attempts++;
    await route.fulfill({ status: attempts === 1 ? 429 : 503, contentType: "application/json", headers: { "Retry-After": "2" }, body: JSON.stringify({ error: { code: attempts === 1 ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE", message: attempts === 1 ? "Fixture quota reached. Saved checks remain available." : "Fixture retry reached the service.", retryable: true, action: "WAIT", retryAfter: attempts === 1 ? 2 : undefined } }) });
  });
  await page.goto("/check/new");
  await page.getByRole("button", { name: "Start my check" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Fixture quota reached");
  await expect(page.getByRole("button", { name: /Try again in/ })).toBeDisabled();
  expect(new URL(page.url()).pathname).toBe("/check/new");
  await expect(page.getByRole("link", { name: "Open saved checks" })).toHaveAttribute("href", "/looks");
  await expect(page.getByRole("button", { name: "Start my check" })).toBeEnabled({ timeout: 5000 });
  await page.getByRole("button", { name: "Start my check" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Fixture retry reached");
  expect(ids).toHaveLength(2);
  expect(ids[0]).toMatch(/^[a-f0-9-]{36}$/);
  expect(ids[1]).toBe(ids[0]);
});

test("GET checks is method rejection, and viewing the start page creates no check", async ({ page }) => {
  let creates = 0;
  page.on("request", (req) => { if (new URL(req.url()).pathname === "/api/checks" && req.method() === "POST") creates++; });
  await page.goto("/check/new");
  await page.reload();
  for (let i = 0; i < 3; i++) expect((await page.request.get("/api/checks")).status()).toBe(405);
  expect(creates).toBe(0);
});

test("entry and recorded proof fit 320, 375, 390, 768 and desktop widths", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 375, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/check/new", "/"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    }
  }
});
