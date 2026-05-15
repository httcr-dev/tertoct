import { getDateKeyForOffset, utcDateAtLocalTime } from "./dateKey";

describe("dateKey", () => {
  it("getDateKeyForOffset formats YYYY-MM-DD in shifted UTC", () => {
    const d = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
    expect(getDateKeyForOffset(d, -180)).toBe("2026-01-15");
  });

  it("utcDateAtLocalTime maps local clock to UTC instant", () => {
    const t = utcDateAtLocalTime("2026-01-15", 7 * 60, -180);
    expect(t.toISOString()).toBe("2026-01-15T10:00:00.000Z");
  });

  it("utcDateAtLocalTime returns invalid for bad dateKey", () => {
    expect(Number.isNaN(utcDateAtLocalTime("bad", 0, 0).getTime())).toBe(true);
  });
});
