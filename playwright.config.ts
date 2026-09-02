import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      // Real WebKit engine at iPhone size — the closest automated Safari
      // validation available. (Not equivalent to a physical iPhone test.)
      name: "mobile-webkit",
      use: { ...devices["iPhone 15 Pro Max"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    port: 3100,
    reuseExistingServer: true,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3100",
      APPLE_TEAM_ID: "TESTTEAMID",
      APPLE_PASS_TYPE_ID: "pass.test.byzcard",
      APPLE_PASS_CERT_PEM_FILE: "test/fixtures/apple-test-cert.pem",
      APPLE_PASS_KEY_PEM_FILE: "test/fixtures/apple-test-key.pem",
      APPLE_WWDR_CERT_PEM_FILE: "test/fixtures/apple-test-wwdr.pem",
      GOOGLE_WALLET_ISSUER_ID: "3388000000000000000",
      GOOGLE_WALLET_SA_EMAIL: "test@byzcard-test.iam.gserviceaccount.com",
      GOOGLE_WALLET_SA_KEY_PEM_FILE: "test/fixtures/google-test-key.pem",
    },
  },
});
