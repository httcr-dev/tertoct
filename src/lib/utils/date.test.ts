import { startOfWeek, toDate } from "./date";

describe("startOfWeek", () => {
  it("returns Monday for a Wednesday", () => {
    // 2026-03-25 is a Wednesday
    const wed = new Date(2026, 2, 25, 14, 30, 0);
    const result = startOfWeek(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(23);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("returns same Monday for a Monday input", () => {
    const mon = new Date(2026, 2, 23, 10, 0, 0);
    const result = startOfWeek(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(23);
  });

  it("returns previous Monday for a Sunday", () => {
    // 2026-03-29 is a Sunday
    const sun = new Date(2026, 2, 29, 18, 0, 0);
    const result = startOfWeek(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(23);
  });

  it("returns Monday for a Saturday", () => {
    // 2026-03-28 is a Saturday
    const sat = new Date(2026, 2, 28, 12, 0, 0);
    const result = startOfWeek(sat);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(23);
  });

  it("does not mutate the original date", () => {
    const original = new Date(2026, 2, 25, 14, 30, 0);
    const originalTime = original.getTime();
    startOfWeek(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

describe("toDate", () => {
  it("returns null for null/undefined/empty values", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate(0)).toBeNull();
    expect(toDate("")).toBeNull();
  });

  it("returns the same Date instance if given a Date", () => {
    const d = new Date(2026, 0, 1);
    expect(toDate(d)).toBe(d);
  });

  it("handles Firestore Timestamp-like objects with toDate()", () => {
    const fakeTimestamp = {
      toDate: () => new Date(2026, 5, 15, 10, 30, 0),
    };
    const result = toDate(fakeTimestamp);
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(5);
    expect(result!.getDate()).toBe(15);
  });

  it("handles raw seconds-based objects", () => {
    const secondsObj = { seconds: 1735689600 }; // 2025-01-01 00:00:00 UTC
    const result = toDate(secondsObj);
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(1735689600 * 1000);
  });

  it("returns null for unknown object shapes", () => {
    expect(toDate({ foo: "bar" })).toBeNull();
    expect(toDate({ notADate: true })).toBeNull();
  });

  it("prefers toDate() over seconds when both exist", () => {
    const hybrid = {
      toDate: () => new Date(2026, 0, 1),
      seconds: 9999999999,
    };
    const result = toDate(hybrid);
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(0);
    expect(result!.getDate()).toBe(1);
  });
});
