import { test, expect } from "@playwright/test";
import { E2E_LABELS } from "./constants";

test.describe("visitante (sem login)", () => {
  test("landing exibe hero e planos do seed", async ({ page }) => {
    await page.goto("/#plans");
    await expect(
      page.getByRole("heading", {
        name: /Treino de boxe focado/i,
      }),
    ).toBeVisible();
    await expect(page.getByTestId("landing-login-google")).toBeVisible();
    await expect(page.getByText(E2E_LABELS.planName)).toBeVisible();
  });

  test("/dashboard redireciona para a home sem sessão", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: /Treino de boxe focado/i,
      }),
    ).toBeVisible();
  });
});
