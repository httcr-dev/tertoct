export {};

const mockIncrement = jest.fn((n: number) => ({ __increment: n }));
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => mockIncrement(n),
    serverTimestamp: () => mockServerTimestamp(),
  },
}));

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: mockGet,
        set: mockSet,
      }),
    }),
  }),
}));

const mockAggregate = jest.fn();

jest.mock("./checkinCounts", () => ({
  aggregateCheckinCountsSince: (...args: unknown[]) => mockAggregate(...args),
  getDefaultCoachCountsSince: () => new Date("2026-05-01T00:00:00.000Z"),
}));

import {
  applyCheckinRollupDecrement,
  applyCheckinRollupIncrement,
  isWithinRollupWindow,
  readCheckinCountRollup,
  rebuildCheckinCountRollup,
} from "./checkinCountRollup";

describe("checkinCountRollup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("readCheckinCountRollup clamps negative and zero counts", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        counts: { a: 2, b: 0, c: -1, d: "x" },
      }),
    });

    await expect(readCheckinCountRollup()).resolves.toEqual({ a: 2 });
  });

  it("readCheckinCountRollup returns null when doc missing", async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(readCheckinCountRollup()).resolves.toBeNull();
  });

  it("applyCheckinRollupIncrement merges increment", () => {
    const tx = { set: jest.fn() };
    const db = {
      collection: () => ({ doc: () => "rollup-ref" }),
    };

    applyCheckinRollupIncrement(tx as never, db as never, "user-1");

    expect(tx.set).toHaveBeenCalledWith(
      "rollup-ref",
      expect.objectContaining({
        counts: { "user-1": { __increment: 1 } },
      }),
      { merge: true },
    );
  });

  it("applyCheckinRollupDecrement merges decrement", () => {
    const tx = { set: jest.fn() };
    const db = {
      collection: () => ({ doc: () => "rollup-ref" }),
    };

    applyCheckinRollupDecrement(tx as never, db as never, "user-1");

    expect(tx.set).toHaveBeenCalledWith(
      "rollup-ref",
      expect.objectContaining({
        counts: { "user-1": { __increment: -1 } },
      }),
      { merge: true },
    );
  });

  it("isWithinRollupWindow respects 30-day window", () => {
    const now = Date.now();
    expect(isWithinRollupWindow(new Date(now - 29 * 24 * 60 * 60 * 1000))).toBe(
      true,
    );
    expect(isWithinRollupWindow(new Date(now - 31 * 24 * 60 * 60 * 1000))).toBe(
      false,
    );
    expect(isWithinRollupWindow(null)).toBe(false);
  });

  it("rebuildCheckinCountRollup writes aggregated counts", async () => {
    mockAggregate.mockResolvedValue({ u1: 3 });
    await expect(rebuildCheckinCountRollup()).resolves.toEqual({ u1: 3 });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        windowDays: 30,
        counts: { u1: 3 },
      }),
    );
  });
});
