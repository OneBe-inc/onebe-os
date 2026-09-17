import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    channel: "chromium",
    baseURL: "http://127.0.0.1:5181",
    viewport: { width: 1536, height: 1024 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:mock -- --port 5181",
    url: "http://127.0.0.1:5181",
    reuseExistingServer: !process.env.CI,
  },
});
