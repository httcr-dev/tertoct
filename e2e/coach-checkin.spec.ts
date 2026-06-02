import { test, expect } from "@playwright/test";
import { E2E_LABELS } from "./constants";
import { coachSidebar } from "./helpers/dashboard";
import { performAdvanceCheckin } from "./helpers/checkin";
import {
  clearStudentCheckinData,
  resetE2eStudentState,
} from "./helpers/emulator";

test.describe.configure({ mode: "serial" });

test.describe("coach — acompanhamento de check-ins", () => {
  test.beforeAll(async () => {
    await clearStudentCheckinData();
    await resetE2eStudentState();
  });

  test.afterAll(async () => {
    await clearStudentCheckinData();
    await resetE2eStudentState();
  });

  test("registra check-in do aluno E2E e exibe na aba Check-Ins", async ({
    page,
    browser,
  }) => {
    const studentContext = await browser.newContext({
      storageState: "e2e/.auth/student.json",
    });
    const studentPage = await studentContext.newPage();
    await studentPage.goto("/dashboard?tab=checkin");
    await expect(studentPage.getByTestId("student-logout")).toBeVisible({
      timeout: 30_000,
    });
    const targetDate = await performAdvanceCheckin(studentPage);
    await studentContext.close();

    await page.goto("/dashboard");
    await coachSidebar(page).getByTestId("coach-tab-checkins").click();
    await expect(page.locator("header h1")).toHaveText("Check-Ins", {
      timeout: 30_000,
    });

    await page.locator('input[type="date"]').fill(targetDate);
    await page.locator("select").nth(1).selectOption({ label: E2E_LABELS.studentName });

    const checkinCard = page
      .locator("main .dashboard-card.group")
      .filter({ hasText: E2E_LABELS.studentName })
      .filter({ hasText: E2E_LABELS.className });
    await expect(checkinCard).toBeVisible({ timeout: 15_000 });
    await expect(checkinCard.getByText("Realizado")).toBeVisible();
  });

  test("abre histórico de check-ins do aluno na gestão", async ({ page }) => {
    await page.goto("/dashboard?tab=students");
    await expect(page.locator("header h1")).toHaveText("Alunos", {
      timeout: 30_000,
    });

    const row = page.locator("table tbody tr").filter({
      hasText: E2E_LABELS.studentName,
    });
    await row.getByRole("button", { name: "Histórico" }).click();

    const modal = page.locator(".animate-modal-in");
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByText(E2E_LABELS.studentName)).toBeVisible();
    await expect(modal.getByText(E2E_LABELS.className)).toBeVisible();
  });
});
