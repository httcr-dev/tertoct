import {
  formatDateKey,
  getWeekDateKeys,
  getWeekDays,
  getWeekEnd,
  getWeekStart,
  isDateKeyInCurrentWeek,
  isInCurrentWeek,
} from "./weekFilters";

/** Wednesday 25 Mar 2026 */
const ref = new Date(2026, 2, 25, 10, 0, 0);

describe("weekFilters", () => {
  it("getWeekStart returns Monday at midnight", () => {
    const start = getWeekStart(ref);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(23);
    expect(start.getHours()).toBe(0);
  });

  it("getWeekEnd returns Friday end of day", () => {
    const end = getWeekEnd(ref);
    expect(end.getDay()).toBe(5);
    expect(end.getDate()).toBe(27);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("getWeekDays returns Mon–Fri", () => {
    const days = getWeekDays(ref);
    expect(days).toHaveLength(5);
    expect(days[0].getDay()).toBe(1);
    expect(days[4].getDay()).toBe(5);
  });

  it("formatDateKey produces YYYY-MM-DD", () => {
    expect(formatDateKey(ref)).toBe("2026-03-25");
  });

  it("getWeekDateKeys lists business week keys", () => {
    expect(getWeekDateKeys(ref)).toEqual([
      "2026-03-23",
      "2026-03-24",
      "2026-03-25",
      "2026-03-26",
      "2026-03-27",
    ]);
  });

  it("isInCurrentWeek detects dates inside the business week", () => {
    jest.useFakeTimers();
    jest.setSystemTime(ref);
    expect(isInCurrentWeek(new Date(2026, 2, 24))).toBe(true);
    expect(isInCurrentWeek(new Date(2026, 2, 22))).toBe(false);
    jest.useRealTimers();
  });

  it("isDateKeyInCurrentWeek matches week keys", () => {
    jest.useFakeTimers();
    jest.setSystemTime(ref);
    expect(isDateKeyInCurrentWeek("2026-03-25")).toBe(true);
    expect(isDateKeyInCurrentWeek("2026-03-20")).toBe(false);
    jest.useRealTimers();
  });

  it("getWeekDays uses current date by default", () => {
    jest.useFakeTimers();
    jest.setSystemTime(ref);
    const days = getWeekDays();
    expect(days).toHaveLength(5);
    expect(days[0].getDay()).toBe(1);
    jest.useRealTimers();
  });
});
