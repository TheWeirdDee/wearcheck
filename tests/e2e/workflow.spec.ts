import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

/**
 * End-to-end workflow against the real app. Steps that call the vision model or YouCam are
 * tagged @live and only run with E2E_LIVE=1 plus a permissioned full-length photo:
 *   E2E_PHOTO=<full-body photo, feet visible>
 * The invitation is the repository's labelled sample. Every journey asserts its preconditions:
 * if the app can't reach the state a test is about, the test fails rather than skipping ahead.
 */
const LIVE = process.env.E2E_LIVE === "1";
const PHOTO = process.env.E2E_PHOTO ?? "";
const INVITATION = "tests/fixtures/sample-invitation.png";
const LIVE_OK = LIVE && existsSync(PHOTO);
const RENDER = LIVE_OK && process.env.E2E_RENDER === "1";
const RESULT_LABELS = /AI re-read of the preview: (the requirement appears to be met|still unresolved|couldn't tell — treat as unresolved)/;

async function startCheck(page: Page) {
  await page.goto("/check/new");
  await page.getByRole("button", { name: "Start my check" }).click();
  await page.waitForURL(/\/check\/[0-9a-f-]{36}\/invitation$/);
  return page.url().match(/check\/([0-9a-f-]{36})/)![1];
}

async function enterManual(page: Page, opts: { occasion?: string; dress: string; setting: string; restrictions: string }) {
  await page.getByRole("tab", { name: "Enter details" }).click();
  await page.getByLabel("Occasion").selectOption(opts.occasion ?? "wedding");
  if (opts.dress) await page.getByLabel(/Dress code, as written/).fill(opts.dress);
  await page.locator("label", { hasText: new RegExp(`^${opts.setting}$`, "i") }).click();
  if (opts.restrictions) await page.getByLabel(/Restrictions or notes/).fill(opts.restrictions);
  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.waitForURL(/\/requirements$/);
}

async function addPhoto(page: Page, file: string) {
  await page.getByRole("button", { name: "These details are correct" }).click();
  await page.waitForURL(/\/outfit$/);
  await page.locator('input[aria-label="Choose outfit photo"]').setInputFiles(file);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.waitForURL(/\/assessment$/);
  await expect(page.getByRole("heading", { name: "Breakdown" })).toBeVisible({ timeout: 150_000 });
}

/** A check from typed details plus the photo, landing on its assessment. */
async function manualCheck(page: Page, opts: Parameters<typeof enterManual>[1], file = PHOTO) {
  const id = await startCheck(page);
  await enterManual(page, opts);
  await addPhoto(page, file);
  return id;
}

/** Download the decision card through its link, then open the downloaded file in the browser. */
async function downloadAndOpenCard(page: Page, context: BrowserContext) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Download decision card/ }).first().click()]);
  expect(dl.suggestedFilename()).toBe("wearcheck-decision-card.png");
  const file = path.join(mkdtempSync(path.join(tmpdir(), "wc-card-")), "card.png");
  await dl.saveAs(file);
  const viewer = await context.newPage();
  await viewer.goto(pathToFileURL(file).href);
  const size = await viewer.locator("img").evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight]);
  expect(size).toEqual([1080, 1350]);
  await viewer.screenshot({ path: test.info().outputPath("opened-decision-card.png") });
  await viewer.close();
}

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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
    for (const route of [`/api/checks/${id}`, `/api/checks/${id}/decision-card`]) expect((await p2.request.get(route)).status()).toBe(404);
    expect((await p2.request.delete(`/api/checks/${id}`, { headers: { origin: new URL(page.url()).origin } })).status()).toBe(404);
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

test.describe("live assessments @live", () => {
  test.skip(!LIVE_OK, "Set E2E_LIVE=1 and E2E_PHOTO to a permissioned full-length photo");
  test.setTimeout(5 * 60_000);

  test("cropped photo + zero requirements: no verdict, unseen shoes not passed, a full-length photo requested", async ({ page }) => {
    const cropped = path.join(mkdtempSync(path.join(tmpdir(), "wc-crop-")), "cropped.jpg");
    const meta = await sharp(PHOTO).metadata();
    await sharp(PHOTO).extract({ left: 0, top: 0, width: meta.width!, height: Math.round(meta.height! * 0.45) }).jpeg().toFile(cropped);
    const id = await manualCheck(page, { occasion: "celebration", dress: "", setting: "Not sure", restrictions: "" }, cropped);
    await expect(page.getByText("No specific requirements to check").first()).toBeVisible();
    await expect(page.getByText(/Looks compatible/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /We didn't assess this outfit/ })).toBeVisible();
    await expect(page.getByText(/head-to-toe photo/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Add the event’s requirements" })).toBeVisible();
    await expect(page.getByText("Not checked — not visible").first()).toBeVisible(); // the shoes row
    await expect(page.getByText("No clear issue")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("cropped-no-requirements.png"), fullPage: true });
    // Exploring a change offers only what this photo supports.
    await page.goto(`/check/${id}/options?explore=1`);
    await expect(page.getByTestId("unsupported-shoes")).toBeVisible();
    await expect(page.getByTestId("unsupported-full_body")).toBeVisible();
    // Add a requirement: the same cropped photo is now "not enough information" and asks for a better photo.
    await page.goto(`/check/${id}/requirements`);
    await page.getByRole("textbox", { name: "Dress code" }).fill("Formal");
    await page.getByRole("button", { name: "These details are correct" }).click();
    await page.waitForURL(/\/outfit$/);
    await page.goto(`/check/${id}/assessment`);
    await expect(page.getByText(/Not enough information|We couldn't check your requirements/).first()).toBeVisible({ timeout: 150_000 });
    await expect(page.getByRole("link", { name: "Use a different photo" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Preview the smallest change" })).toHaveCount(0);
  });

  test("no-change outcome: checked requirements met → keep → decision → downloaded card opened, no render", async ({ page, context }) => {
    const id = await manualCheck(page, { occasion: "work", dress: "Formal", setting: "indoor", restrictions: "No trainers\nAvoid red" });
    await expect(page.getByText("Looks compatible with the stated requirements").first()).toBeVisible();
    const checked = page.locator("section[aria-labelledby=h-checked]");
    await expect(checked.getByText("Checked · fits").first()).toBeVisible();
    await expect(checked.getByText(/No trainers/)).toBeVisible();
    await page.getByRole("link", { name: "Explore a change (optional)" }).click();
    await expect(page.getByRole("heading", { name: "What would you like to change?" })).toBeVisible();
    await expect(page.getByTestId("catalogue")).toHaveCount(0);
    await page.getByRole("link", { name: "Change the shoes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Change the shoes", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Upload a photo of the shoes/ })).toBeDisabled();
    await page.goto(`/check/${id}/assessment`);
    await page.getByRole("button", { name: "Save my outfit check" }).click();
    await page.waitForURL(/\/decision$/);
    await expect(page.getByRole("heading", { name: "Keep your outfit." })).toBeVisible();
    await expect(page.locator('img[alt^="AI-generated preview"]')).toHaveCount(0);
    await downloadAndOpenCard(page, context);
    expect((await (await page.request.get(`/api/checks/${id}`)).json()).decision).toBe("keep");
    await page.goto(`/check/${id}/preview`);
    await expect(page.getByRole("heading", { name: "No preview yet" })).toBeVisible();
  });

  test("invitation image upload is read by the vision model and quoted", async ({ page, isMobile }) => {
    test.skip(isMobile, "one reading per run, to bound free-tier use");
    await startCheck(page);
    await page.locator('input[aria-label="Choose invitation image"]').setInputFiles(INVITATION);
    await page.getByRole("button", { name: "Continue" }).first().click();
    await page.waitForURL(/\/requirements$/, { timeout: 150_000 });
    await expect(page.getByText("From invitation").first()).toBeVisible();
    await expect(page.getByText(/white or ivory/i).first()).toBeVisible();
    await expect(page.getByText(/flats or wedges/i).first()).toBeVisible();
    await expect(page.getByText(/Avoid: white, ivory/i).first()).toBeVisible(); // an exclusion, whatever the model labelled it
  });

  test("different inputs give different choices (not a fixed first item per category)", async ({ browser, isMobile }) => {
    test.skip(isMobile, "logic is viewport-independent; run once");
    const lists: string[][] = [];
    for (const restrictions of ["Flats or wedges recommended", "Heels or wedges required"]) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      const id = await manualCheck(p, { dress: "Formal", setting: "indoor", restrictions });
      await p.goto(`/check/${id}/options?explore=1&category=shoes`);
      await expect(p.getByTestId("catalogue")).toBeVisible();
      lists.push(await p.getByTestId("catalogue").locator("h3").allInnerTexts());
      await expect(p.getByTestId("reasons").first()).toContainText(/fits “/);
      await ctx.close();
    }
    expect(lists[0]).not.toEqual(lists[1]);
    expect(lists[0].join()).not.toMatch(/heels/i);
    expect(lists[1].join()).not.toMatch(/loafer/i);
  });
});

/**
 * Real YouCam renders through the UI (paid: 2 units each). Gated separately so a normal live run never
 * spends credit: E2E_LIVE=1 E2E_RENDER=1 E2E_PHOTO=<photo>. Run once, on desktop; the mobile layout of the
 * same live check is verified inside each test with a second, mobile-sized browser on the same session.
 */
async function renderJourney(page: Page, browser: Browser, context: BrowserContext, o: {
  restrictions: string; dress?: string; upload?: string; item?: RegExp; recheck: boolean;
}) {
  const checkId = await manualCheck(page, { dress: o.dress ?? "Formal", setting: "indoor", restrictions: o.restrictions });
  // Precondition: a finding with a preview. Anything else fails the test here.
  await page.getByRole("link", { name: "Preview the smallest change" }).click();
  await page.waitForURL(/\/options$/);
  await expect(page.getByText("What gets replaced")).toBeVisible();
  for (const w of await page.getByTestId("catalogue").locator(":scope > li").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))) expect(w).toBeGreaterThanOrEqual(240);
  if (o.upload) {
    await page.getByRole("checkbox", { name: /I own this image/ }).check();
    await page.locator('input[aria-label="Upload your own reference item"]').setInputFiles(o.upload);
    await expect(page.getByText("Selected: your item")).toBeVisible({ timeout: 60_000 });
  } else {
    const card = page.getByTestId("catalogue").locator(":scope > li", { has: page.getByRole("heading", { name: o.item! }) });
    await card.getByRole("button", { name: "Select this item" }).click();
  }
  // Before generating: original, the selected reference, what's replaced and by which API, and why.
  const bar = page.getByTestId("selection-bar");
  await expect(page.getByTestId("generation-review")).toBeVisible();
  for (const size of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.getByTestId("generation-review").scrollIntoViewIfNeeded();
    expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(0);
    const ref = await page.getByAltText(/^Reference for generation:/).boundingBox();
    expect(ref!.width).toBeGreaterThan(150);
    await page.screenshot({ path: test.info().outputPath(`selected-reference-${size.width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(bar.getByAltText("Your original photo")).toBeVisible();
  await expect(bar.getByAltText(/^Selected:/)).toBeVisible();
  await expect(bar.getByText(/Replaces your .* · generated by YouCam (Clothes V4|Shoes V3)/)).toBeVisible();
  await bar.getByRole("button", { name: "Generate preview" }).click();
  await page.waitForURL(/\/preview\?job=/, { timeout: 90_000 });
  const jobId = new URL(page.url()).searchParams.get("job");

  // Refresh mid-task: the same job resumes; no second job is created.
  await page.waitForTimeout(3000);
  await page.reload();
  expect(new URL(page.url()).searchParams.get("job")).toBe(jobId);
  await expect(page.getByRole("heading", { name: "Your AI preview" })).toBeVisible({ timeout: 6 * 60_000 });
  const img = page.locator('img[alt^="AI-generated preview"]').first();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 30_000 }).toBeGreaterThan(0);

  // An obvious comparison: whole frame in view (short desktop window too), and a zoom onto what changed.
  for (const size of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.reload();
    await page.waitForTimeout(1500);
    const frame = await page.getByTestId("compare-frame").boundingBox();
    expect(frame!.y).toBeGreaterThanOrEqual(0);
    expect(frame!.y + frame!.height).toBeLessThanOrEqual(size.height + 1);
    expect(await noHorizontalScroll(page)).toBeLessThanOrEqual(0);
  }
  const zoom = page.getByRole("button", { name: "Zoom to the change" });
  await expect(zoom).toBeEnabled({ timeout: 15_000 }); // the two images really differ
  await zoom.click();
  await expect(page.getByText("Zoomed to the changed area")).toBeVisible();
  await page.getByRole("button", { name: "Show full photo" }).click();
  await page.screenshot({ path: test.info().outputPath("generated-comparison.png"), fullPage: true });

  // A provider success is not a resolved requirement.
  const outcome = page.getByTestId("preview-outcome");
  await expect(outcome).toContainText("Not re-checked — treat as unresolved");
  let state = "Not re-checked — treat as unresolved";
  if (o.recheck) {
    await outcome.getByRole("button", { name: "Check the preview against the rule" }).click();
    await expect(outcome.getByRole("status")).toHaveText(RESULT_LABELS, { timeout: 120_000 });
    state = (await outcome.getByRole("status").innerText()).trim();
  }

  // Same live check on a phone-sized screen: usable comparison, no sideways scroll.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: await context.storageState() });
  const m = await mobile.newPage();
  await m.goto(page.url());
  await expect(m.getByRole("heading", { name: "Your AI preview" })).toBeVisible();
  await m.waitForTimeout(1500);
  const mf = await m.getByTestId("compare-frame").boundingBox();
  expect(mf!.width).toBeGreaterThan(300);
  expect(mf!.y + mf!.height).toBeLessThanOrEqual(844 + 1);
  const toggle = m.getByRole("group", { name: "Comparison view" }).getByRole("button", { name: "Original" });
  await toggle.tap();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(await noHorizontalScroll(m)).toBeLessThanOrEqual(0);
  await m.goto(`/check/${checkId}/options`);
  await expect(m.getByTestId("selection-bar")).toBeVisible();
  expect(await noHorizontalScroll(m)).toBeLessThanOrEqual(0);
  await mobile.close();

  // Preview download.
  const previewHref = await page.getByRole("link", { name: /Download image/ }).getAttribute("href");
  const dl = await page.request.get(previewHref!);
  expect(dl.status()).toBe(200);
  expect(dl.headers()["content-type"]).toContain("image/jpeg");
  expect(dl.headers()["content-disposition"]).toContain("attachment");

  // Choose the change → decision states the recheck outcome → downloaded card opened.
  await page.getByRole("button", { name: "Use this look" }).click();
  await page.waitForURL(/\/decision$/);
  await expect(page.getByText("Does the preview meet it?")).toBeVisible();
  await expect(page.getByText(state.startsWith("AI re-read") ? state : "Not re-checked — treat as unresolved until you've checked the preview")).toBeVisible();
  if (!/appears to be met/.test(state)) await expect(page.getByRole("heading", { name: /unresolved/ })).toBeVisible();
  await downloadAndOpenCard(page, context);

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
  test.setTimeout(12 * 60_000);

  test("garment (Clothes V4): “No white” → ranked blue shirt → render → refresh → comparison → AI recheck → card → isolation → delete", async ({ page, browser, context, isMobile }) => {
    test.skip(isMobile, "run once, on desktop, to bound credit use (mobile layout is checked inside)");
    await renderJourney(page, browser, context, { restrictions: "Please avoid white or ivory", item: /Blue cotton/i, recheck: true });
  });

  test("shoes (Shoes V3) with a user-uploaded reference: “heels or wedges required” → own photo of a wedge → render → card → delete", async ({ page, browser, context, isMobile }) => {
    test.skip(isMobile, "run once, on desktop, to bound credit use (mobile layout is checked inside)");
    // Deterministic for flat shoes, loafers or boots: none is a heel or a wedge.
    await renderJourney(page, browser, context, { restrictions: "Heels or wedges required", upload: "public/reference/wedge-black-sandal.jpg", recheck: false });
  });
});
