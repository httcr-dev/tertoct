import {
  clampCheckinDateKey,
  getAllowedCheckinDateKeys,
  getDefaultCheckinDateKey,
  isAllowedCheckinDateKey,
  isWeekdayDateKey,
  localDateToDateKey,
} from "./checkinDate";

function ref(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe("checkinDate", () => {
  it("identifies weekdays", () => {
    expect(isWeekdayDateKey("2026-05-18")).toBe(true); // Mon
    expect(isWeekdayDateKey("2026-05-16")).toBe(false); // Sat
    expect(isWeekdayDateKey("2026-05-17")).toBe(false); // Sun
  });

  it("defaults to today on weekdays", () => {
    expect(getDefaultCheckinDateKey(ref(2026, 5, 14))).toBe("2026-05-14"); // Thu
  });

  it("defaults to next Monday on weekends", () => {
    expect(getDefaultCheckinDateKey(ref(2026, 5, 16))).toBe("2026-05-18"); // Sat
    expect(getDefaultCheckinDateKey(ref(2026, 5, 17))).toBe("2026-05-18"); // Sun
  });

  it("lists remaining weekdays in the work week", () => {
    expect(getAllowedCheckinDateKeys(ref(2026, 5, 14))).toEqual([
      "2026-05-14",
      "2026-05-15",
    ]);
  });

  it("lists Mon–Fri when starting on Monday", () => {
    expect(getAllowedCheckinDateKeys(ref(2026, 5, 18))).toEqual([
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
    ]);
  });

  it("rejects past and weekend dates", () => {
    const today = ref(2026, 5, 14);
    expect(isAllowedCheckinDateKey("2026-05-13", localDateToDateKey(today))).toBe(
      false,
    );
    expect(isAllowedCheckinDateKey("2026-05-16", localDateToDateKey(today))).toBe(
      false,
    );
    expect(isAllowedCheckinDateKey("2026-05-14", localDateToDateKey(today))).toBe(
      true,
    );
  });

  it("clamps invalid selection to nearest allowed day", () => {
    const today = ref(2026, 5, 14);
    expect(clampCheckinDateKey("2026-05-12", today)).toBe("2026-05-14");
    expect(clampCheckinDateKey("2026-05-16", today)).toBe("2026-05-15");
  });
});
