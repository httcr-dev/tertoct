import { expect, type Page } from "@playwright/test";
import { nextAdvanceCheckinDateKeyInWorkWeek } from "./dates";

/** Clica em check-in antecipado e espera confirmação (API + estado do botão). */
export async function performAdvanceCheckin(page: Page): Promise<string> {
  const targetDate = nextAdvanceCheckinDateKeyInWorkWeek();
  if (!targetDate) {
    throw new Error(
      "No advance check-in date in the current work week (e.g. Friday afternoon)",
    );
  }
  await page.getByTestId(`student-checkin-date-${targetDate}`).click();

  const submit = page.getByTestId("student-checkin-submit");
  await expect(submit).toBeEnabled({ timeout: 15_000 });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/private/checkins") &&
      response.request().method() === "POST",
  );
  await submit.click();

  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  await expect(submit).toHaveText("Check-in já realizado", { timeout: 15_000 });

  return targetDate;
}
