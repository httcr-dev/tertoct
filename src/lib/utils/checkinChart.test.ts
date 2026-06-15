import {
  buildCheckinChartItems,
  countCheckinsByDateKeys,
} from "./checkinChart";

describe("checkinChart", () => {
  const weekKeys = [
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
  ];

  it("countCheckinsByDateKeys aggregates in one pass", () => {
    const checkins = [
      { classDateKey: "2026-03-23" },
      { classDateKey: "2026-03-23" },
      { classDateKey: "2026-03-25" },
      { classDateKey: "2026-03-30" },
    ];

    const counts = countCheckinsByDateKeys(checkins, weekKeys);
    expect(counts.get("2026-03-23")).toBe(2);
    expect(counts.get("2026-03-24")).toBe(0);
    expect(counts.get("2026-03-25")).toBe(1);
    expect(counts.has("2026-03-30")).toBe(false);
  });

  it("buildCheckinChartItems uses weekday labels in week view", () => {
    const counts = new Map([
      ["2026-03-23", 2],
      ["2026-03-24", 0],
      ["2026-03-25", 1],
      ["2026-03-26", 0],
      ["2026-03-27", 3],
    ]);

    const items = buildCheckinChartItems(weekKeys, counts, { weekView: true });
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({ key: "2026-03-23", count: 2, label: "Seg" });
    expect(items[4].label).toBe("Sex");
  });

  it("buildCheckinChartItems uses day numbers in month view", () => {
    const counts = new Map([["2026-03-01", 1]]);
    const items = buildCheckinChartItems(["2026-03-01"], counts);
    expect(items[0].label).toBe("01");
  });
});
