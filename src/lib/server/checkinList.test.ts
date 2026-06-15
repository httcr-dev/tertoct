export {};

const mockGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => {
        const chain = {
          where: () => chain,
          orderBy: () => chain,
          limit: () => ({
            get: mockGet,
          }),
        };
        return chain;
      },
    }),
  }),
}));

import { listCheckinsSince } from "./checkinList";

describe("listCheckinsSince", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queries by classDateKey when week keys are provided", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "c1",
          data: () => ({
            userId: "u1",
            planId: "p1",
            classDateKey: "2026-06-09",
            createdAt: { toDate: () => new Date("2026-06-09T12:00:00Z") },
          }),
        },
      ],
    });

    const items = await listCheckinsSince(new Date("2026-01-01"), {
      classDateKeys: ["2026-06-09", "2026-06-10"],
    });

    expect(items).toHaveLength(1);
    expect(items[0].classDateKey).toBe("2026-06-09");
  });

  it("queries by classDateKey range for month periods", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "c2",
          data: () => ({
            userId: "u1",
            planId: "p1",
            classDateKey: "2026-03-15",
            createdAt: { toDate: () => new Date("2026-03-15T12:00:00Z") },
          }),
        },
      ],
    });

    const items = await listCheckinsSince(new Date("2026-01-01"), {
      classDateKeyFrom: "2026-03-01",
      classDateKeyTo: "2026-03-31",
    });

    expect(items).toHaveLength(1);
    expect(items[0].classDateKey).toBe("2026-03-15");
  });
});
