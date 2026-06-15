import { test, expect } from "@playwright/test";

test.describe("aluno dashboard — gráfico (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("visão geral exibe filtro de semana", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("group", { name: "Período do gráfico" })).toBeVisible();
    await expect(page.getByText(/sua atividade/i)).toBeVisible();
  });
});
