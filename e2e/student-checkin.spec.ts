import { test, expect } from "@playwright/test";
import { nextWeekdayDateKeyFromToday } from "./helpers/dates";
import {
  clearStudentCheckinData,
  fillWeeklyCheckinLimit,
  restoreDefaultClassSchedule,
  restoreDefaultStudentProfile,
  setClassDeadlineInPast,
  setClassFullForDate,
  setStudentPaymentOverdue,
  setStudentPlan,
} from "./helpers/emulator";

test.describe.configure({ mode: "serial" });

test.describe("aluno — fluxo de check-in", () => {
  test.beforeEach(async () => {
    await clearStudentCheckinData();
    await restoreDefaultStudentProfile();
    await restoreDefaultClassSchedule();
  });

  test("check-in antecipado para próximo dia útil", async ({ page }) => {
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    const targetDate = nextWeekdayDateKeyFromToday(1);
    await page.getByTestId(`student-checkin-date-${targetDate}`).click();

    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    await expect(
      page.getByRole("status").filter({ hasText: "Check-in realizado" }),
    ).toBeVisible();
    await expect(submit).toHaveText("Check-in já realizado");
  });

  test("bloqueia check-in sem plano associado", async ({ page }) => {
    await setStudentPlan(null);
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText("Aguardando plano");
    await expect(page.getByText(/não possui um plano associado/i)).toBeVisible();
  });

  test("bloqueia check-in com mensalidade pendente", async ({ page }) => {
    await setStudentPaymentOverdue(true);
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText("Mensalidade pendente");
    await expect(page.getByText(/Mensalidade pendente/i).first()).toBeVisible();
  });

  test("bloqueia check-in após horário máximo (hoje)", async ({ page }) => {
    await setClassDeadlineInPast();
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText("Check-in encerrado");
    await expect(page.getByText(/horário máximo de check-in/i)).toBeVisible();
  });

  test("bloqueia check-in quando limite semanal foi atingido", async ({ page }) => {
    await fillWeeklyCheckinLimit();
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText("Limite atingido");
    await expect(page.getByText(/limite de check-ins para esta semana/i)).toBeVisible();
  });

  test("bloqueia check-in quando turma está lotada", async ({ page }) => {
    const targetDate = nextWeekdayDateKeyFromToday(1);
    await setClassFullForDate(targetDate);
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId(`student-checkin-date-${targetDate}`).click();
    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeDisabled({ timeout: 15_000 });
    await expect(submit).toHaveText("Turma lotada");
    await expect(page.getByText(/Turma lotada/i).first()).toBeVisible();
  });

  test("cancela check-in antecipado na visão geral", async ({ page }) => {
    const targetDate = nextWeekdayDateKeyFromToday(1);
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId(`student-checkin-date-${targetDate}`).click();
    const submit = page.getByTestId("student-checkin-submit");
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();
    await expect(
      page.getByRole("status").filter({ hasText: "Check-in realizado" }),
    ).toBeVisible();

    await page.getByTestId("student-tab-overview").click();
    const checkinId = `e2e-student_e2e-class_${targetDate}`;
    const cancelBtn = page.getByTestId(`student-cancel-checkin-${checkinId}`);
    await expect(cancelBtn).toBeVisible({ timeout: 15_000 });
    await cancelBtn.click();

    await expect(page.getByText(/Check-in cancelado/i)).toBeVisible();
    await expect(cancelBtn).toHaveCount(0);
  });
});
