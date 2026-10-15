import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests expect a running app at BASE_URL (default: the dev server).
 * Set PLAYWRIGHT_CHROMIUM to a Chromium binary when browsers are not
 * downloaded (e.g. CI images with a system Chromium).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : undefined,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 14"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
