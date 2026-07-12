/**
 * Golden-path E2E config. Owner: P7.
 * Boots the ONE Next.js server with MOCK_LLM=true (fixtures, no real LLM —
 * contracts §7; ADR 0004 single repo/single deploy). CI runs exactly this.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: { MOCK_LLM: "true", APP_URL: "http://localhost:3000" },
  },
});
