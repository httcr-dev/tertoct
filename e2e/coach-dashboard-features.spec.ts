import { test, expect } from "@playwright/test";

test.describe("coach dashboard — novas funcionalidades (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("visão geral exibe filtro de semana do gráfico", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("group", { name: "Período do gráfico" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Semana passada" })).toBeVisible();
    await page.getByRole("button", { name: "Semana passada" }).click();
    await expect(page.getByRole("button", { name: "Semana passada" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("aba alunos carrega sem erro de pagamento", async ({ page }) => {
    await page.goto("/dashboard?tab=students");
    await expect(page.locator("header h1")).toHaveText("Alunos", {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Gestão de Alunos" }),
    ).toBeVisible();
  });

  test("histórico de check-ins tem filtro de período utilizável", async ({ page }) => {
    await page.goto("/dashboard?tab=checkins");
    await expect(page.locator("header h1")).toHaveText("Check-Ins", {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Histórico de Check-Ins" }),
    ).toBeVisible();

    const periodSelect = page.getByLabel("Período do histórico");
    await expect(periodSelect).toBeVisible();
    await periodSelect.selectOption("current-month");
    await expect(page.getByText(/mês atual/i).first()).toBeVisible();

    await periodSelect.selectOption("pick-week");
    await expect(page.getByLabel("Escolher semana")).toBeVisible();

    await periodSelect.selectOption("pick-month");
    await expect(page.getByLabel("Escolher mês")).toBeVisible();
  });
});
