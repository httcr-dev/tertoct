import { expect, type Page } from "@playwright/test";
import { signInAsCoach, signInAsStudent } from "./auth";

export async function waitForStudentDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  if (!page.url().includes("/dashboard")) {
    await signInAsStudent(page);
    return;
  }
  await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
}

export async function waitForCoachDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  if (!page.url().includes("/dashboard")) {
    await signInAsCoach(page);
    return;
  }
  await expect(page.getByText("Carregando dados do painel...")).toBeHidden({
    timeout: 45_000,
  });
  await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible({
    timeout: 45_000,
  });
}

export function coachSidebar(page: Page) {
  return page.locator("aside");
}
