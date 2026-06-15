import { test, expect } from "@playwright/test";
import path from "node:path";
import { E2E_LABELS } from "./constants";
import { coachSidebar, waitForCoachCheckinsTab } from "./helpers/dashboard";
import {
  resetE2eStudentState,
  restoreDefaultClassSchedule,
  setClassSchedule,
} from "./helpers/emulator";

/**
 * Smoke tests pós-deploy — cobrem os fluxos críticos alinhados com firestore.rules.
 * Ver docs/SMOKE_TEST_POST_DEPLOY.md para checklist manual completo.
 */
test.describe("smoke pós-deploy — visitante", () => {
  test("landing e redirect do dashboard", async ({ page }) => {
    await page.goto("/#plans");
    await expect(page.getByTestId("landing-login-google")).toBeVisible();
    await expect(page.getByText(E2E_LABELS.planName)).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/");
  });
});

test.describe("smoke pós-deploy — aluno", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "student.json") });

  test.beforeEach(async () => {
    await resetE2eStudentState();
    await restoreDefaultClassSchedule();
  });

  test("visão geral, turmas ativas e feedback create/delete via API", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("student-logout")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(E2E_LABELS.planName)).toBeVisible();

    await page.getByTestId("student-tab-checkin").click();
    await expect(
      page.locator("select option", { hasText: E2E_LABELS.className }),
    ).toHaveCount(1);

    await page.getByTestId("student-tab-feedback").click();
    const message = `Smoke feedback ${Date.now()}`;
    await page.getByTestId("student-feedback-input").fill(message);
    await page.getByTestId("student-feedback-submit").click();
    await expect(page.getByText(/Feedback enviado/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(message)).toBeVisible();

    await page
      .locator("div.flex.items-center.justify-between.gap-4")
      .filter({ has: page.getByText(message, { exact: true }) })
      .getByRole("button", { name: "Apagar" })
      .click();
    await expect(page.getByText(/Feedback removido/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(message)).toHaveCount(0);
  });

  test("turma inativa não aparece no check-in", async ({ page }) => {
    await setClassSchedule({ active: false });
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator("select option", { hasText: E2E_LABELS.className }),
    ).toHaveCount(0);
  });
});

test.describe("smoke pós-deploy — coach", () => {
  test.use({ storageState: path.join(__dirname, ".auth", "coach.json") });

  test.beforeEach(async () => {
    await restoreDefaultClassSchedule();
  });

  test("alunos, turmas, planos e aba check-ins carregam", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Visão Geral" })).toBeVisible({
      timeout: 30_000,
    });

    await coachSidebar(page).getByTestId("coach-tab-students").click();
    await expect(page.locator("header h1")).toHaveText("Alunos");
    await expect(
      page.locator("table tbody").getByText(E2E_LABELS.studentName),
    ).toBeVisible();

    await coachSidebar(page).getByTestId("coach-tab-classes").click();
    await expect(page.locator("header h1")).toHaveText("Turmas");
    await expect(page.getByText(E2E_LABELS.className)).toBeVisible();

    await coachSidebar(page).getByTestId("coach-tab-plans").click();
    await expect(page.locator("header h1")).toHaveText("Planos");
    await expect(page.getByText(E2E_LABELS.planName).first()).toBeVisible();

    await coachSidebar(page).getByTestId("coach-tab-checkins").click();
    await waitForCoachCheckinsTab(page);
  });
});
