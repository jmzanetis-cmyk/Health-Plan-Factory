import { defineConfig, devices } from "@playwright/test";

const UI_URL = process.env.UI_URL ?? "http://localhost:5173";

// Use system Chromium from Nix if available (Replit environment).
// In CI, leave CHROMIUM_PATH unset to let Playwright use its downloaded browser.
const executablePath = process.env.CHROMIUM_PATH ?? undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: UI_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `UI_URL=${UI_URL} pnpm dev`,
    url: UI_URL,
    timeout: 60000,
    reuseExistingServer: true,
  },
});
