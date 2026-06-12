export {};

const mockGet = jest.fn();
const mockRollupGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({
        select: () => ({
          get: mockGet,
        }),
      }),
      doc: () => ({
        get: mockRollupGet,
      }),
    }),
  }),
}));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

import {
  aggregateCheckinCountsSince,
  getCachedCheckinCountsForDays,
} from "./checkinCounts";

describe("aggregateCheckinCountsSince", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts check-ins per userId", async () => {
    mockGet.mockResolvedValue({
      docs: [
        { data: () => ({ userId: "a" }) },
        { data: () => ({ userId: "a" }) },
        { data: () => ({ userId: "b" }) },
        { data: () => ({ userId: "" }) },
        { data: () => ({}) },
      ],
    });

    const since = new Date("2026-01-01");
    const counts = await aggregateCheckinCountsSince(since);

    expect(counts).toEqual({ a: 2, b: 1 });
  });
});

describe("getCachedCheckinCountsForDays", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefers rollup for 30-day window", async () => {
    mockRollupGet.mockResolvedValue({
      exists: true,
      data: () => ({ counts: { u1: 4 } }),
    });

    await expect(getCachedCheckinCountsForDays(30)).resolves.toEqual({ u1: 4 });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("falls back to aggregation when rollup is empty", async () => {
    mockRollupGet.mockResolvedValue({ exists: false });
    mockGet.mockResolvedValue({
      docs: [{ data: () => ({ userId: "u2" }) }],
    });

    await expect(getCachedCheckinCountsForDays(30)).resolves.toEqual({ u2: 1 });
  });
});
