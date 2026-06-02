import { test, expect } from "@playwright/test";
import { performAdvanceCheckin } from "./helpers/checkin";
import { nextWeekdayDateKeyFromToday, workWeekDateKeys } from "./helpers/dates";
import {
  clearStudentCheckinData,
  fillWeeklyCheckinLimit,
  setClassDeadlineInPast,
  setClassFullForDate,
  setStudentPaymentOverdue,
  resetE2eStudentState,
  setStudentPlan,
} from "./helpers/emulator";

test.describe.configure({ mode: "serial" });

test.describe("aluno — fluxo de check-in", () => {
  test.beforeEach(async () => {
    await clearStudentCheckinData();
    await resetE2eStudentState();
  });

  test.afterEach(async () => {
    await resetE2eStudentState();
  });

  test("check-in antecipado para próximo dia útil", async ({ page }) => {
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await performAdvanceCheckin(page);
  });

  test("bloqueia check-in sem plano associado", async ({ page }) => {
    await setStudentPlan(null);
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("student-checkin-no-plan")).toBeVisible();
    await expect(page.getByTestId("student-checkin-submit")).toHaveCount(0);

    await page.getByTestId("student-tab-overview").click();
    await expect(page.getByText(/sem plano ativo/i)).toBeVisible();
    await expect(page.getByText("Nenhum plano ativo.")).toBeVisible();
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
    await fillWeeklyCheckinLimit(); // seg–qua já ocupados (3/3)
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });

    // Dia sem check-in nesta turma (qui/sex), entre os habilitados no calendário
    const seededDays = new Set(workWeekDateKeys().slice(0, 3));
    let pickedDay: string | null = null;
    for (const day of workWeekDateKeys().slice(3)) {
      const dayBtn = page.getByTestId(`student-checkin-date-${day}`);
      if (seededDays.has(day)) continue;
      if (await dayBtn.isEnabled()) {
        await dayBtn.click();
        pickedDay = day;
        break;
      }
    }
    expect(pickedDay).not.toBeNull();

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
    await page.goto("/dashboard?tab=checkin");
    await expect(page.getByTestId("student-logout")).toBeVisible({ timeout: 30_000 });
    const targetDate = await performAdvanceCheckin(page);

    await page.getByTestId("student-tab-overview").click();
    const checkinId = `e2e-student_e2e-class_${targetDate}`;
    const cancelBtn = page.getByTestId(`student-cancel-checkin-${checkinId}`);
    await expect(cancelBtn).toBeVisible({ timeout: 15_000 });
    await cancelBtn.click();

    await expect(page.getByText(/Check-in cancelado/i)).toBeVisible();
    await expect(cancelBtn).toHaveCount(0);
  });
});
