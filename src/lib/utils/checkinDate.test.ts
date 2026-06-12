import * as checkinDateModule from "./checkinDate";
import {
  assertCheckinDateKeyAllowed,
  clampCheckinDateKey,
  dateKeyToLocalDate,
  formatCheckinDateLabel,
  getAllowedCheckinDateKeys,
  getDefaultCheckinDateKey,
  getTodayDateKey,
  isAllowedCheckinDateKey,
  isPastDateKey,
  isWeekdayDateKey,
  localDateToDateKey,
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

  it("formatCheckinDateLabel marks today and formats other weekdays", () => {
    expect(formatCheckinDateLabel("2026-05-14", "2026-05-14")).toMatch(/^Hoje/);
    expect(formatCheckinDateLabel("2026-05-15", "2026-05-14")).toContain("·");
  });

  it("localDateToDateKey and dateKeyToLocalDate round-trip", () => {
    const date = new Date(2026, 4, 14);
    expect(localDateToDateKey(date)).toBe("2026-05-14");
    expect(dateKeyToLocalDate("2026-05-14").getDate()).toBe(14);
  });

  it("dateKeyToLocalDate returns invalid date for malformed keys", () => {
    expect(Number.isNaN(dateKeyToLocalDate("bad").getTime())).toBe(true);
  });

  it("isPastDateKey compares lexicographic date keys", () => {
    expect(isPastDateKey("2026-05-13", "2026-05-14")).toBe(true);
    expect(isPastDateKey("2026-05-14", "2026-05-14")).toBe(false);
  });

  it("isAllowedCheckinDateKey rejects weekends", () => {
    expect(isAllowedCheckinDateKey("2026-05-16", "2026-05-14")).toBe(false);
  });

  it("getDefaultCheckinDateKey on Saturday picks next Monday", () => {
    expect(getDefaultCheckinDateKey(gymDay("2026-05-16"))).toBe("2026-05-18");
  });

  it("clampCheckinDateKey snaps future dates to last allowed weekday", () => {
    const reference = gymDay("2026-05-14");
    expect(clampCheckinDateKey("2026-05-20", reference)).toBe("2026-05-15");
  });

  it("getAllowedCheckinDateKeys on Sunday starts on Monday", () => {
    expect(getAllowedCheckinDateKeys(gymDay("2026-05-17"))[0]).toBe("2026-05-18");
  });

  it("isPastDateKey uses today by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(isPastDateKey("2026-05-13")).toBe(true);
    jest.useRealTimers();
  });

  it("isAllowedCheckinDateKey uses today by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(isAllowedCheckinDateKey("2026-05-14")).toBe(true);
    jest.useRealTimers();
  });

  it("getDefaultCheckinDateKey uses current date by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(getDefaultCheckinDateKey()).toBe("2026-05-14");
    jest.useRealTimers();
  });

  it("assertCheckinDateKeyAllowed uses current date by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(() => assertCheckinDateKeyAllowed("2026-05-14")).not.toThrow();
    jest.useRealTimers();
  });

  it("formatCheckinDateLabel uses today by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(formatCheckinDateLabel("2026-05-14")).toMatch(/^Hoje/);
    jest.useRealTimers();
  });

  it("clampCheckinDateKey uses current date by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(clampCheckinDateKey("2026-05-12")).toBe("2026-05-14");
    jest.useRealTimers();
  });

  it("getAllowedCheckinDateKeys uses current date by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(gymDay("2026-05-14"));
    expect(getAllowedCheckinDateKeys()).toEqual(["2026-05-14", "2026-05-15"]);
    jest.useRealTimers();
  });

  it("getAllowedCheckinDateKeys on Saturday starts on Monday", () => {
    expect(getAllowedCheckinDateKeys(gymDay("2026-05-16"))[0]).toBe("2026-05-18");
  });

  it("getTodayDateKey uses current time by default", () => {
    expect(getTodayDateKey(gymDay("2026-05-14"))).toBe("2026-05-14");
  });

  it("clampCheckinDateKey falls back when no allowed keys remain", () => {
    const reference = gymDay("2026-05-14");
    const allowedSpy = jest
      .spyOn(checkinDateModule, "getAllowedCheckinDateKeys")
      .mockReturnValueOnce([]);
    const defaultSpy = jest
      .spyOn(checkinDateModule, "getDefaultCheckinDateKey")
      .mockReturnValueOnce("2026-05-14");

    expect(checkinDateModule.clampCheckinDateKey("2026-05-12", reference)).toBe(
      "2026-05-14",
    );

    allowedSpy.mockRestore();
    defaultSpy.mockRestore();
  });

  it("getDefaultCheckinDateKey falls back to today when allowed list is empty", () => {
    const reference = gymDay("2026-05-14");
    const allowedSpy = jest
      .spyOn(checkinDateModule, "getAllowedCheckinDateKeys")
      .mockReturnValueOnce([]);
    const todaySpy = jest
      .spyOn(checkinDateModule, "getTodayDateKey")
      .mockReturnValueOnce("2026-05-14");

    expect(checkinDateModule.getDefaultCheckinDateKey(reference)).toBe(
      "2026-05-14",
    );

    allowedSpy.mockRestore();
    todaySpy.mockRestore();
  });
});
