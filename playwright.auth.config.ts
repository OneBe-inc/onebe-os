import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-auth",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    channel: "chromium",
    baseURL: "http://localhost:8788",
    viewport: { width: 1536, height: 1024 },
    locale: "ja-JP",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "node scripts/prepare-auth-test.mjs && npx wrangler dev --env local --port 8788 --var APP_ORIGIN:http://localhost:8788 --persist-to .wrangler/auth-browser --local",
    url: "http://localhost:8788/login",
    reuseExistingServer: false,
    timeout: 90000,
  },
});
