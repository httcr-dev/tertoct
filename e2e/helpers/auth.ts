import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

type E2eTokens = {
  student: string;
  coach: string;
};

async function loadTokens(): Promise<E2eTokens> {
  const raw = await readFile(
    path.join(__dirname, "../.auth/tokens.json"),
    "utf8",
  );
  return JSON.parse(raw) as E2eTokens;
}

/** Waits until Firebase sign-in + session cookie + claims sync finish (avoids aborting in-flight POSTs). */
async function waitForSessionSync(page: Page): Promise<void> {
  const isCookiePost = (response: { url: () => string; request: () => { method: () => string }; ok: () => boolean }) =>
    response.url().includes("/api/auth/cookie") &&
    response.request().method() === "POST" &&
    response.ok();

  const firstCookie = page.waitForResponse(isCookiePost, { timeout: 45_000 });
  const claimsRefresh = page
    .waitForResponse(
      (response) =>
        response.url().includes("/api/auth/refresh-claims") && response.ok(),
      { timeout: 45_000 },
    )
    .catch(() => undefined);

  await Promise.all([firstCookie, claimsRefresh]);

  await page.waitForResponse(isCookiePost, { timeout: 10_000 }).catch(() => undefined);
}

async function waitForCoachDashboardReady(page: Page): Promise<void> {
  await expect(page.getByText("Carregando dados do painel...")).toBeHidden({
    timeout: 45_000,
  });
  await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible({
    timeout: 45_000,
  });
}

export async function signInWithCustomToken(
  page: Page,
  customToken: string,
  role: "student" | "coach",
): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(
    () => typeof window.__TEROCT_E2E_SIGN_IN__ === "function",
    undefined,
    { timeout: 30_000 },
  );

  const sessionSync = waitForSessionSync(page);

  await page.evaluate(async (token) => {
    await window.__TEROCT_E2E_SIGN_IN__!(token);
  }, customToken);

  await sessionSync;
  await page.goto("/dashboard");

  if (role === "student") {
    await expect(page.getByTestId("student-logout")).toBeVisible({
      timeout: 45_000,
    });
  } else {
    await waitForCoachDashboardReady(page);
  }
}

export async function signInAsStudent(page: Page): Promise<void> {
  await page.goto("/dashboard");
  if (await page.getByTestId("student-logout").isVisible().catch(() => false)) {
    return;
  }
  const tokens = await loadTokens();
  await signInWithCustomToken(page, tokens.student, "student");
}

export async function signInAsCoach(page: Page): Promise<void> {
  await page.goto("/dashboard");
  if (
    await page
      .getByRole("heading", { name: "Visão Geral" })
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }
  const tokens = await loadTokens();
  await signInWithCustomToken(page, tokens.coach, "coach");
}
