import { aggregateCheckinsByClass } from "./checkins";
import type { CheckIn } from "@/lib/types";

function makeCheckin(
  overrides: Partial<CheckIn> & { createdAt: Date | number },
): CheckIn {
  return {
    id: "ci-1",
    userId: "u1",
    planId: "p1",
    classId: "c1",
    classDateKey: null,
    className: null,
    classStartTime: null,
    createdAt: new Date(0),
    ...overrides,
  };
}

describe("aggregateCheckinsByClass", () => {
  const now = new Date(2026, 5, 1, 12, 0, 0); // 1 Jun 2026

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("aggregates check-ins by class name within the default window", () => {
    const recent = new Date(2026, 4, 28); // within 14 days
    const old = new Date(2026, 4, 10); // outside 14 days

    const checkins = [
      makeCheckin({ className: "Manhã", createdAt: recent }),
      makeCheckin({ id: "ci-2", className: "Manhã", createdAt: recent }),
      makeCheckin({ id: "ci-3", className: "Noite", createdAt: recent }),
      makeCheckin({ id: "ci-4", className: "Noite", createdAt: old }),
      makeCheckin({ id: "ci-5", className: null, createdAt: recent }),
    ];

    const result = aggregateCheckinsByClass(checkins);

    expect(result.get("Manhã")).toBe(2);
    expect(result.get("Noite")).toBe(1);
    expect(result.get("Sem turma")).toBe(1);
    expect(result.has("ci-4")).toBe(false);
  });

  it("respects custom day window", () => {
    const inside = new Date(2026, 4, 30);
    const outside = new Date(2026, 4, 20);

    const checkins = [
      makeCheckin({ className: "A", createdAt: inside }),
      makeCheckin({ id: "ci-2", className: "B", createdAt: outside }),
    ];

    const result = aggregateCheckinsByClass(checkins, 7);

    expect(result.get("A")).toBe(1);
    expect(result.has("B")).toBe(false);
  });

  it("handles numeric and Firestore-like timestamps", () => {
    const ms = now.getTime() - 2 * 24 * 60 * 60 * 1000;
    const checkins = [
      makeCheckin({ className: "X", createdAt: ms }),
      makeCheckin({
        id: "ci-2",
        className: "Y",
        createdAt: { toDate: () => new Date(ms) } as unknown as Date,
      }),
    ];

    const result = aggregateCheckinsByClass(checkins);

    expect(result.get("X")).toBe(1);
    expect(result.get("Y")).toBe(1);
  });

  it("skips check-ins with unparseable dates", () => {
    const checkins = [
      makeCheckin({
        className: "Z",
        createdAt: { invalid: true } as unknown as Date,
      }),
    ];

    const result = aggregateCheckinsByClass(checkins);
    expect(result.size).toBe(0);
  });
});
