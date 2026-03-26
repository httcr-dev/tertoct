// Mock firebase/firestore before imports
const mockAddDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockCollection = jest.fn().mockReturnValue("checkins-collection-ref");
const mockQuery = jest.fn().mockReturnValue("checkins-query");
const mockWhere = jest.fn().mockReturnValue("where-clause");
const mockServerTimestamp = jest.fn().mockReturnValue("SERVER_TIMESTAMP");

jest.mock("firebase/firestore", () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock("@/lib/firebase", () => ({
  getFirestoreDb: jest.fn().mockReturnValue("mock-db"),
}));

// Don't mock toDate — let it use the real implementation for integration coverage

import { createCheckIn, fetchCheckinsByUser } from "./checkinService";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createCheckIn", () => {
  it("calls addDoc with userId, planId, and serverTimestamp", async () => {
    await createCheckIn("user-1", "plan-1");

    expect(mockCollection).toHaveBeenCalledWith("mock-db", "checkins");
    expect(mockAddDoc).toHaveBeenCalledWith("checkins-collection-ref", {
      userId: "user-1",
      planId: "plan-1",
      createdAt: "SERVER_TIMESTAMP",
    });
  });
});

describe("fetchCheckinsByUser", () => {
  it("queries checkins by userId and returns sorted results", async () => {
    const mockDocs = [
      {
        id: "checkin-1",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { toDate: () => new Date(2026, 0, 1), seconds: 1735689600 },
        }),
      },
      {
        id: "checkin-2",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { toDate: () => new Date(2026, 0, 5), seconds: 1736035200 },
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (cb: (item: any) => void) => mockDocs.forEach(cb),
    });

    const result = await fetchCheckinsByUser("user-1");

    expect(mockWhere).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(result).toHaveLength(2);
    // Should be sorted descending (newest first)
    expect(result[0].id).toBe("checkin-2");
    expect(result[1].id).toBe("checkin-1");
  });

  it("returns empty array when no checkins exist", async () => {
    mockGetDocs.mockResolvedValue({
      forEach: () => {},
    });

    const result = await fetchCheckinsByUser("user-empty");

    expect(result).toHaveLength(0);
  });

  it("handles checkins with seconds-based timestamps (no toDate)", async () => {
    const mockDocs = [
      {
        id: "checkin-3",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { seconds: 1735689600 },
        }),
      },
      {
        id: "checkin-4",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { seconds: 1736035200 },
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (cb: (item: any) => void) => mockDocs.forEach(cb),
    });

    const result = await fetchCheckinsByUser("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("checkin-4");
    expect(result[1].id).toBe("checkin-3");
  });

  it("handles checkins without createdAt (null timestamps)", async () => {
    const mockDocs = [
      {
        id: "checkin-5",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (cb: (item: any) => void) => mockDocs.forEach(cb),
    });

    const result = await fetchCheckinsByUser("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("checkin-5");
  });

  it("sorts correctly when one item has createdAt and another does not", async () => {
    const mockDocs = [
      {
        id: "checkin-a",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { toDate: () => new Date(2026, 5, 15) },
        }),
      },
      {
        id: "checkin-b",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: null,
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (cb: (item: any) => void) => mockDocs.forEach(cb),
    });

    const result = await fetchCheckinsByUser("user-1");
    expect(result).toHaveLength(2);
    // The one with a date should come first (descending)
    expect(result[0].id).toBe("checkin-a");
    expect(result[1].id).toBe("checkin-b");
  });

  it("sorts correctly when first item has no createdAt", async () => {
    const mockDocs = [
      {
        id: "checkin-x",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: null,
        }),
      },
      {
        id: "checkin-y",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { toDate: () => new Date(2026, 5, 15) },
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (cb: (item: any) => void) => mockDocs.forEach(cb),
    });

    const result = await fetchCheckinsByUser("user-1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("checkin-y");
    expect(result[1].id).toBe("checkin-x");
  });
});
