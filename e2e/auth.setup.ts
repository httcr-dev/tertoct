import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test as setup } from "@playwright/test";
import { signInWithCustomToken } from "./helpers/auth";

const authDir = path.join(__dirname, ".auth");
const studentAuthFile = path.join(authDir, "student.json");
const coachAuthFile = path.join(authDir, "coach.json");

setup.beforeAll(async () => {
  await mkdir(authDir, { recursive: true });
});

async function saveAuthState(
  browser: import("@playwright/test").Browser,
  role: "student" | "coach",
  authFile: string,
): Promise<void> {
  const tokens = JSON.parse(
    await readFile(path.join(authDir, "tokens.json"), "utf8"),
  ) as { student: string; coach: string };
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInWithCustomToken(page, tokens[role], role);
  await context.storageState({ path: authFile });
  await context.close();
}

setup("authenticate as student", async ({ browser }) => {
  await saveAuthState(browser, "student", studentAuthFile);
});

setup("authenticate as coach", async ({ browser }) => {
  await saveAuthState(browser, "coach", coachAuthFile);
});
