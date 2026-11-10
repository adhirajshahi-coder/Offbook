import { defineConfig, devices } from "@playwright/test";

/**
 * Critical-path end-to-end tests (PRD §16 Phase 6). Run against a running
 * app (production build recommended):
 *   npx next build && npx next start -p 3001
 *   npm run test:e2e
 * Uses the installed Chrome, so no browser download is needed.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    channel: "chrome",
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
});
