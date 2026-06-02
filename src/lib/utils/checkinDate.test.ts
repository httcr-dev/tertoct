import {
  assertCheckinDateKeyAllowed,
  clampCheckinDateKey,
  getAllowedCheckinDateKeys,
  getDefaultCheckinDateKey,
  getTodayDateKey,
  isAllowedCheckinDateKey,
  isWeekdayDateKey,
} from "./checkinDate";
import { utcDateAtLocalTime } from "./dateKey";

/** Gym-local calendar day (UTC−3); stable in CI regardless of host TZ. */
function gymDay(dateKey: string): Date {
  return utcDateAtLocalTime(dateKey, 12 * 60, -180);
}

describe("checkinDate", () => {
  it("identifies weekdays", () => {
    expect(isWeekdayDateKey("2026-05-18")).toBe(true); // Mon
    expect(isWeekdayDateKey("2026-05-16")).toBe(false); // Sat
    expect(isWeekdayDateKey("2026-05-17")).toBe(false); // Sun
  });

  it("defaults to today on weekdays", () => {
    expect(getDefaultCheckinDateKey(gymDay("2026-05-14"))).toBe("2026-05-14"); // Thu
  });

  it("defaults to next Monday on weekends", () => {
    expect(getDefaultCheckinDateKey(gymDay("2026-05-16"))).toBe("2026-05-18"); // Sat
    expect(getDefaultCheckinDateKey(gymDay("2026-05-17"))).toBe("2026-05-18"); // Sun
  });

  it("lists remaining weekdays in the work week", () => {
    expect(getAllowedCheckinDateKeys(gymDay("2026-05-14"))).toEqual([
      "2026-05-14",
      "2026-05-15",
    ]);
  });

  it("lists Mon–Fri when starting on Monday", () => {
    expect(getAllowedCheckinDateKeys(gymDay("2026-05-18"))).toEqual([
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
    ]);
  });

  it("rejects past and weekend dates", () => {
    const reference = gymDay("2026-05-14");
    const todayKey = getTodayDateKey(reference);
    expect(todayKey).toBe("2026-05-14");
    expect(isAllowedCheckinDateKey("2026-05-13", todayKey)).toBe(false);
    expect(isAllowedCheckinDateKey("2026-05-16", todayKey)).toBe(false);
    expect(isAllowedCheckinDateKey("2026-05-14", todayKey)).toBe(true);
  });

  it("clamps invalid selection to nearest allowed day", () => {
    const reference = gymDay("2026-05-14");
    expect(clampCheckinDateKey("2026-05-12", reference)).toBe("2026-05-14");
    expect(clampCheckinDateKey("2026-05-16", reference)).toBe("2026-05-15");
  });

  it("assertCheckinDateKeyAllowed rejects dates outside the work week window", () => {
    const reference = gymDay("2026-05-14");
    expect(() => assertCheckinDateKeyAllowed("2026-05-18", reference)).toThrow(
      /não disponível/i,
    );
    expect(() =>
      assertCheckinDateKeyAllowed("2026-05-15", reference),
    ).not.toThrow();
  });
});
