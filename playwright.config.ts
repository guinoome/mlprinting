import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.ML_DEP_PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const useExternalServer = process.env.ML_DEP_PLAYWRIGHT_EXTERNAL_SERVER === "1";
const browserChannel = process.env.ML_DEP_PLAYWRIGHT_CHANNEL;

/**
 * E2E config. Phase 0: structure ready, no flows to test yet.
 * Later phases add specs under ./e2e.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
  webServer: useExternalServer
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
