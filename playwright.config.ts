import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests run against a real running WearCheck (local or deployed) — no mocks.
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test
 * Tests tagged @live call the real vision model and/or YouCam and spend provider quota;
 * they only run when E2E_LIVE=1 and E2E_PHOTO / E2E_INVITATION point at permissioned local images.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.E2E_JSON_OUTPUT ? [["list"], ["json", { outputFile: process.env.E2E_JSON_OUTPUT }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    storageState: process.env.E2E_STORAGE_STATE || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grepInvert: /@desktop-only/ },
  ],
});
