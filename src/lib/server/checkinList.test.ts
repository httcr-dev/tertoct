export {};

const mockGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: (...args: unknown[]) => {
        if (args[0] === "classDateKey") {
          return {
            orderBy: () => ({
              limit: () => ({
                get: mockGet,
              }),
            }),
          };
        }
        return {
          orderBy: () => ({
            limit: () => ({
              get: mockGet,
            }),
          }),
        };
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
});
