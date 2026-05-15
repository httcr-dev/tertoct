import { test, expect } from "@playwright/test";
import { E2E_LABELS } from "./constants";
import { coachSidebar } from "./helpers/dashboard";

test.describe("coach autenticado", () => {
  test("dashboard carrega visão geral", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(E2E_LABELS.coachName)).toBeVisible();
  });

  test("lista alunos com o aluno E2E", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible({
      timeout: 30_000,
    });
    await coachSidebar(page).getByTestId("coach-tab-students").click();
    await expect(page.locator("header h1")).toHaveText("Alunos");
    await expect(
      page.locator("h3").filter({ hasText: E2E_LABELS.studentName }),
    ).toBeVisible();
  });

  test("lista turmas com a turma E2E", async ({ page }) => {
    await page.goto("/dashboard");
    await coachSidebar(page).getByTestId("coach-tab-classes").click();
    await expect(page.locator("header h1")).toHaveText("Turmas");
    await expect(page.getByText(E2E_LABELS.className)).toBeVisible();
  });

  test("lista planos com o plano E2E", async ({ page }) => {
    await page.goto("/dashboard");
    await coachSidebar(page).getByTestId("coach-tab-plans").click();
    await expect(page.locator("header h1")).toHaveText("Planos");
    await expect(
      page.getByRole("heading", { name: "Planos e valores" }),
    ).toBeVisible();
    await expect(page.getByText(E2E_LABELS.planName).first()).toBeVisible();
  });
});
