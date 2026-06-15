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

export async function waitForCoachCheckinsTab(page: Page): Promise<void> {
  await expect(page.locator("header h1")).toHaveText("Check-Ins", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Histórico de Check-Ins" }),
  ).toBeVisible();
  await expect(page.getByLabel("Período do histórico")).toBeVisible({
    timeout: 30_000,
  });
}

export async function filterCoachCheckins(
  page: Page,
  options: { studentName?: string; weekDate?: string } = {},
): Promise<void> {
  const periodSelect = page.getByLabel("Período do histórico");
  if (options.weekDate) {
    await periodSelect.selectOption("pick-week");
    await page.getByLabel("Escolher semana").fill(options.weekDate);
  }
  if (options.studentName) {
    await page
      .getByLabel("Filtrar por aluno")
      .selectOption({ label: options.studentName });
  }
}
