import { expect, test, type Page } from "@playwright/test";
import { existsSync, statSync } from "node:fs";

/**
 * End-to-end workflow against the real app. Steps that call the vision model or YouCam are
 * tagged @live and only run with E2E_LIVE=1 plus permissioned local images:
 *   E2E_PHOTO=<full-body photo, feet visible>  E2E_INVITATION=<invitation image>
 */
const LIVE = process.env.E2E_LIVE === "1";
const PHOTO = process.env.E2E_PHOTO ?? "";
const INVITATION = process.env.E2E_INVITATION ?? "";

async function startCheck(page: Page) {
  await page.goto("/check/new");
  await page.getByRole("button", { name: "Start my check" }).click();
  await page.waitForURL(/\/check\/[0-9a-f-]{36}\/invitation$/);
  return page.url().match(/check\/([0-9a-f-]{36})/)![1];
}

async function enterManual(page: Page, opts: { dress: string; setting: string; restrictions: string }) {
  await page.getByRole("tab", { name: "Enter details" }).click();
  await page.getByLabel("Occasion").selectOption("wedding");
  await page.getByLabel(/Dress code, as written/).fill(opts.dress);
  await page.locator("label", { hasText: new RegExp(`^${opts.setting}$`, "i") }).click();
  await page.getByLabel(/Restrictions or notes/).fill(opts.restrictions);
  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.waitForURL(/\/requirements$/);
}

test.describe("guest workflow (no provider calls)", () => {
  test("manual entry → review → confirm, with editing and source labels", async ({ page }) => {
    await startCheck(page);
    await enterManual(page, { dress: "Formal", setting: "outdoor", restrictions: "Please avoid white or ivory\nFlats or wedges recommended" });
    await expect(page.getByRole("heading", { name: "Here’s what we understood" })).toBeVisible();
    await expect(page.getByText("Entered by you").first()).toBeVisible();
    await expect(page.getByText("From invitation")).toHaveCount(0); // manual entry never claims invitation text
    await page.getByRole("button", { name: "These details are correct" }).click();
    await page.waitForURL(/\/outfit$/);
    await expect(page.getByRole("heading", { name: /Show us what you’re planning to wear/ })).toBeVisible();
    // Consent is not pre-checked and gates upload.
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("refresh keeps the session; another browser can't open the check", async ({ page, browser }) => {
    const id = await startCheck(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "What’s the occasion?" })).toBeVisible();

    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(`/check/${id}/invitation`);
    await expect(p2.getByRole("heading", { name: "We can’t open this check" })).toBeVisible();
    for (const path of [`/api/checks/${id}`, `/api/checks/${id}/decision-card`]) {
      const r = await p2.request.get(path);
      expect(r.status()).toBe(404);
    }
    const del = await p2.request.delete(`/api/checks/${id}`, { headers: { origin: new URL(page.url()).origin } });
    expect(del.status()).toBe(404);
    await other.close();
  });

  test("cross-origin state changes are rejected", async ({ page }) => {
    const id = await startCheck(page);
    const r = await page.request.put(`/api/checks/${id}/event`, { headers: { origin: "https://evil.example", "content-type": "application/json" }, data: { setting: "indoor" } });
    expect(r.status()).toBe(403);
  });

  test("delete removes access immediately", async ({ page }) => {
    const id = await startCheck(page);
    await page.getByRole("button", { name: "Delete this check" }).first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page.waitForURL(/\/\?deleted=1$/);
    await page.goto(`/check/${id}/invitation`);
    await expect(page.getByRole("heading", { name: "We can’t open this check" })).toBeVisible();
  });

  test("unsupported and unreadable uploads fall back to manual entry", async ({ page }) => {
    await startCheck(page);
    await page.locator('input[aria-label="Choose invitation image"]').setInputFiles({ name: "invite.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(page.getByRole("alert").filter({ hasText: /PDF/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter the details instead" })).toBeVisible();
  });
});

test.describe("live pipeline @live", () => {
  test.skip(!LIVE || !existsSync(PHOTO), "Set E2E_LIVE=1 and E2E_PHOTO to a permissioned full-body photo");

  test("photo → real assessment → keep → readable decision card (no render)", async ({ page }) => {
    await startCheck(page);
    await enterManual(page, { dress: "Smart casual", setting: "indoor", restrictions: "" });
    await page.getByRole("button", { name: "These details are correct" }).click();
    await page.waitForURL(/\/outfit$/);
    await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(PHOTO);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/assessment$/);
    await expect(page.getByText(/Looks compatible|One change worth considering|Potential dress-code conflict|Not enough information/)).toBeVisible({ timeout: 90_000 });
    const keep = page.getByRole("button", { name: /Save my outfit check|Keep this outfit/ });
    if (await keep.isEnabled()) {
      await keep.click();
      await page.waitForURL(/\/decision$/);
      const card = await page.request.get(page.url().replace(/\/check\/(.+)\/decision$/, "/api/checks/$1/decision-card"));
      expect(card.status()).toBe(200);
      expect(card.headers()["content-type"]).toContain("image/png");
      expect((await card.body()).length).toBeGreaterThan(50_000);
    }
  });

});

test.describe("live invitation reading @live", () => {
  test.skip(!LIVE || !existsSync(INVITATION) || statSync(INVITATION).size === 0, "Set E2E_LIVE=1 and E2E_INVITATION (tests/fixtures/sample-invitation.png works)");

  test("invitation image upload is read by the vision model and quoted", async ({ page }) => {
    await startCheck(page);
    await page.locator('input[aria-label="Choose invitation image"]').setInputFiles(INVITATION);
    await page.getByRole("button", { name: "Continue" }).first().click();
    await page.waitForURL(/\/requirements$/, { timeout: 90_000 });
    await expect(page.getByText("From invitation").first()).toBeVisible();
    if (INVITATION.endsWith("sample-invitation.png")) {
      // The fixture states both rules explicitly; they must survive extraction as invitation-sourced.
      await expect(page.getByText(/white or ivory/i).first()).toBeVisible();
      await expect(page.getByText(/flats or wedges/i).first()).toBeVisible();
    }
  });
});

/**
 * Real YouCam renders through the UI (paid: 2 units each). Gated separately so a normal live run
 * never spends credit: E2E_LIVE=1 E2E_RENDER=1 E2E_PHOTO=<permissioned full-length photo>.
 * Each test also covers refresh recovery, both downloads, ownership isolation and deletion.
 */
const RENDER = LIVE && process.env.E2E_RENDER === "1" && existsSync(PHOTO);

async function renderJourney(page: Page, browser: import("@playwright/test").Browser, exampleIndex: number, item: RegExp, answer?: string) {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Start this example" }).nth(exampleIndex).click();
  await page.waitForURL(/\/requirements$/);
  const checkId = page.url().match(/check\/([0-9a-f-]{36})/)![1];
  await page.getByRole("button", { name: "These details are correct" }).click();
  await page.waitForURL(/\/outfit$/);
  await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(PHOTO);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForURL(/\/assessment$/);
  await expect(page.getByText(/Looks compatible|One change worth considering|Potential dress-code conflict|Not enough information/).first()).toBeVisible({ timeout: 120_000 });
  if (answer && (await page.getByText("One question first").count())) {
    await page.getByRole("button", { name: answer, exact: true }).click();
    await expect(page.getByText("One question first")).toHaveCount(0, { timeout: 60_000 });
  }
  await page.getByRole("link", { name: /Preview the smallest change|Explore alternatives/ }).first().click();
  await page.waitForURL(/\/options/);
  let card = page.locator("li", { has: page.getByRole("heading", { name: item }) }).first();
  if (!(await card.count())) {
    await page.goto(`/check/${checkId}/options?explore=1`);
    card = page.locator("li", { has: page.getByRole("heading", { name: item }) }).first();
  }
  await card.getByRole("button", { name: /Try this|Selected/ }).click();
  await page.getByRole("button", { name: "Generate preview" }).click();
  await page.waitForURL(/\/preview\?job=/, { timeout: 60_000 });
  const jobId = new URL(page.url()).searchParams.get("job");

  // Refresh mid-task: the same job resumes; no second job is created.
  await page.waitForTimeout(3000);
  await page.reload();
  expect(new URL(page.url()).searchParams.get("job")).toBe(jobId);
  await expect(page.getByRole("heading", { name: "Your AI preview" })).toBeVisible({ timeout: 6 * 60_000 });
  const img = page.locator('img[alt^="AI-generated preview"]').first();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 30_000 }).toBeGreaterThan(0);

  // Preview download.
  const previewHref = await page.getByRole("link", { name: /Download image/ }).getAttribute("href");
  const dl = await page.request.get(previewHref!);
  expect(dl.status()).toBe(200);
  expect(dl.headers()["content-type"]).toContain("image/jpeg");
  expect(dl.headers()["content-disposition"]).toContain("attachment");

  // Choose the change → decision card download.
  await page.getByRole("button", { name: "Use this look" }).click();
  await page.waitForURL(/\/decision$/);
  const cardRes = await page.request.get(`/api/checks/${checkId}/decision-card?download=1`);
  expect(cardRes.status()).toBe(200);
  expect(cardRes.headers()["content-type"]).toContain("image/png");
  expect(cardRes.headers()["content-disposition"]).toContain("attachment");

  // Ownership isolation: another browser can't fetch the render.
  const other = await browser.newContext();
  expect((await other.request.get(new URL(previewHref!, page.url()).toString())).status()).toBe(404);
  await other.close();

  // Deletion revokes the render immediately.
  await page.getByRole("button", { name: "Delete this check" }).first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await page.waitForURL(/deleted=1/);
  expect((await page.request.get(previewHref!)).status()).toBe(404);
}

test.describe("live YouCam renders @live @render", () => {
  test.skip(!RENDER, "Paid renders: set E2E_LIVE=1 E2E_RENDER=1 and E2E_PHOTO");
  test.setTimeout(10 * 60_000);

  test("shoe render (Shoes V3): garden wedding → loafer → reload → downloads → isolation → delete", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "run once, on desktop, to bound credit use");
    await renderJourney(page, browser, 0, /tassel loafer/i);
  });

  test("garment render (Clothes V4): avoid white or ivory → blue shirt → reload → downloads → isolation → delete", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "run once, on desktop, to bound credit use");
    await renderJourney(page, browser, 1, /Blue cotton/i, "white");
  });
});
