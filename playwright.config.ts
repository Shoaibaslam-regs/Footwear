import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests: real customer journeys on the built store (`npm run build`
 * first), against the throwaway <db>_e2e database with a fake mail server.
 * See TESTING.md.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalTeardown: "./tests/e2e/teardown.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // one shared test database
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3457",
    channel: "chrome", // the installed Google Chrome
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" }, grep: /@phone/ },
  ],
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://localhost:3457/",
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
