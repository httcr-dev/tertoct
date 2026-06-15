import {
  buildCheckinHistoryPeriod,
  getCheckinHistoryPeriodLabel,
  getMonthDateKeyRange,
  getMonthDateKeys,
  isMonthPeriod,
  resolveCheckinHistoryQuery,
} from "./checkinPeriod";

const ref = new Date(2026, 2, 25, 12, 0, 0);

describe("checkinPeriod", () => {
  it("getMonthDateKeyRange covers full calendar month", () => {
    expect(getMonthDateKeyRange("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("getMonthDateKeys lists every day in the month", () => {
    expect(getMonthDateKeys("2026-03")).toHaveLength(31);
    expect(getMonthDateKeys("2026-03")[0]).toBe("2026-03-01");
    expect(getMonthDateKeys("2026-03")[30]).toBe("2026-03-31");
  });

  it("resolveCheckinHistoryQuery for current week uses business week keys", () => {
    expect(resolveCheckinHistoryQuery({ mode: "current-week" }, ref)).toEqual({
      classDateKeys: [
        "2026-03-23",
        "2026-03-24",
        "2026-03-25",
        "2026-03-26",
        "2026-03-27",
      ],
    });
  });

  it("resolveCheckinHistoryQuery for picked week uses anchor date", () => {
    expect(
      resolveCheckinHistoryQuery(
        { mode: "pick-week", weekAnchor: "2026-03-10" },
        ref,
      ),
    ).toEqual({
      classDateKeys: [
        "2026-03-09",
        "2026-03-10",
        "2026-03-11",
        "2026-03-12",
        "2026-03-13",
      ],
    });
  });

  it("resolveCheckinHistoryQuery for current month uses date key range", () => {
    expect(resolveCheckinHistoryQuery({ mode: "current-month" }, ref)).toEqual({
      classDateKeyFrom: "2026-03-01",
      classDateKeyTo: "2026-03-31",
    });
  });

  it("resolveCheckinHistoryQuery for picked month", () => {
    expect(
      resolveCheckinHistoryQuery({ mode: "pick-month", month: "2026-01" }, ref),
    ).toEqual({
      classDateKeyFrom: "2026-01-01",
      classDateKeyTo: "2026-01-31",
    });
  });

  it("getCheckinHistoryPeriodLabel formats custom week and month", () => {
    expect(
      getCheckinHistoryPeriodLabel(
        { mode: "pick-week", weekAnchor: "2026-03-10" },
        ref,
      ),
    ).toBe("Semana 09 de mar. – 13 de mar.");
    expect(
      getCheckinHistoryPeriodLabel(
        { mode: "pick-month", month: "2026-01" },
        ref,
      ),
    ).toBe("Janeiro de 2026");
  });

  it("buildCheckinHistoryPeriod defaults pick values to now", () => {
    expect(buildCheckinHistoryPeriod("pick-week", {}, ref)).toEqual({
      mode: "pick-week",
      weekAnchor: "2026-03-25",
    });
    expect(buildCheckinHistoryPeriod("pick-month", {}, ref)).toEqual({
      mode: "pick-month",
      month: "2026-03",
    });
  });

  it("isMonthPeriod identifies month modes", () => {
    expect(isMonthPeriod("current-month")).toBe(true);
    expect(isMonthPeriod("pick-month")).toBe(true);
    expect(isMonthPeriod("current-week")).toBe(false);
  });

  it("resolveCheckinHistoryQuery prefers week keys over month range shape", () => {
    const weekQuery = resolveCheckinHistoryQuery({ mode: "current-week" }, ref);
    expect(weekQuery.classDateKeys).toHaveLength(5);
    expect(weekQuery.classDateKeyFrom).toBeUndefined();

    const monthQuery = resolveCheckinHistoryQuery({ mode: "current-month" }, ref);
    expect(monthQuery.classDateKeyFrom).toBe("2026-03-01");
    expect(monthQuery.classDateKeys).toBeUndefined();
  });
});
