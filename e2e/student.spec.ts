import { test, expect } from "@playwright/test";
import { E2E_LABELS } from "./constants";
import { resetE2eStudentState } from "./helpers/emulator";

test.describe("aluno autenticado", () => {
  test.beforeEach(async () => {
    await resetE2eStudentState();
  });

  test("dashboard mostra plano ativo na visão geral", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`Olá, ${E2E_LABELS.studentName.split(" ")[0]}`)).toBeVisible();
    await expect(page.getByText(E2E_LABELS.planName)).toBeVisible();
  });

  test("envia feedback", async ({ page }) => {
    await page.goto("/dashboard?tab=feedback");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("student-tab-feedback").click();
    const message = `E2E feedback ${Date.now()}`;
    await page.getByTestId("student-feedback-input").fill(message);
    await page.getByTestId("student-feedback-submit").click();
    await expect(page.getByText(/Feedback enviado/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(message)).toBeVisible({ timeout: 15_000 });
  });

  test("logout volta para a landing", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("student-logout").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("landing-login-google")).toBeVisible();
  });
});
