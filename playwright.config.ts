import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const authDir = path.join(__dirname, "e2e", ".auth");

const e2eEnv = {
  NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
  NEXT_PUBLIC_E2E: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "tertoct-e2e",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "tertoct-e2e.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789012",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789012:web:e2e000000000",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_PROJECT_ID: "tertoct-e2e",
  GCLOUD_PROJECT: "tertoct-e2e",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  globalSetup: require.resolve("./e2e/global-setup"),
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "guest",
      testMatch: /guest\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "student",
      testMatch: /student\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(authDir, "student.json"),
      },
      dependencies: ["setup"],
    },
    {
      name: "coach",
      testMatch: /coach\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(authDir, "coach.json"),
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: e2eEnv,
  },
});
