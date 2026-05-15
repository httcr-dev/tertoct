import { test, expect } from "@playwright/test";
import { E2E_LABELS } from "./constants";
import { dateKeyFromToday } from "./helpers/dates";

test.describe("aluno autenticado", () => {
  test("dashboard mostra plano ativo na visão geral", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(`Olá, ${E2E_LABELS.studentName.split(" ")[0]}`)).toBeVisible();
    await expect(page.getByText(E2E_LABELS.planName)).toBeVisible();
  });

  test("check-in antecipado para amanhã", async ({ page }) => {
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Pronto para o treino?" })).toBeVisible();

    const tomorrow = dateKeyFromToday(1);
    await page.getByTestId("student-checkin-date").fill(tomorrow);

    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    await expect(
      page.getByRole("status").filter({ hasText: "Check-in registrado" }),
    ).toBeVisible();
    await expect(submit).toHaveText("Check-in já realizado");
  });

  test("envia feedback", async ({ page }) => {
    await page.goto("/dashboard?tab=feedback");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("student-tab-feedback").click();
    const message = `E2E feedback ${Date.now()}`;
    await page.getByTestId("student-feedback-input").fill(message);
    await page.getByTestId("student-feedback-submit").click();
    await expect(
      page.getByRole("status").filter({ hasText: "Feedback enviado" }),
    ).toBeVisible();
    await expect(page.getByText(message)).toBeVisible();
  });

  test("logout volta para a landing", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("student-logout").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("landing-login-google")).toBeVisible();
  });
});
