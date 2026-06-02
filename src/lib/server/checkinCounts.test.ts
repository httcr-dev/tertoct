export {};

const mockGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({
        select: () => ({
          get: mockGet,
        }),
      }),
    }),
  }),
}));

import { aggregateCheckinCountsSince } from "./checkinCounts";

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
