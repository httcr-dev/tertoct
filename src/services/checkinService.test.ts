// Mock firebase/firestore before imports
const mockAddDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockCollection = jest.fn().mockReturnValue("checkins-collection-ref");
const mockQuery = jest.fn().mockReturnValue("checkins-query");
const mockWhere = jest.fn().mockReturnValue("where-clause");
const mockServerTimestamp = jest.fn().mockReturnValue("SERVER_TIMESTAMP");
const mockDoc = jest.fn((_db, col, id) => `${col}/${id ?? "new-id"}`);
const mockRunTransaction = jest.fn();
const mockTxGet = jest.fn();
const mockTxSet = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock("firebase/firestore", () => ({
  addDoc: mockAddDoc,
  collection: mockCollection,
  doc: mockDoc,
  getDocs: mockGetDocs,
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: mockQuery,
  runTransaction: mockRunTransaction,
  where: mockWhere,
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock("@/lib/firebase", () => ({
  getFirestoreDb: jest.fn().mockReturnValue("mock-db"),
}));

// Don't mock toDate — let it use the real implementation for integration coverage

import {
  cancelCheckIn,
  createCheckIn,
  fetchCheckinsByUser,
  listenCheckinsByUser,
} from "./checkinService";

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  }) as unknown as typeof fetch;
  mockRunTransaction.mockImplementation(async (_db, callback) =>
    callback({
      get: mockTxGet,
      set: mockTxSet,
    }),
  );
});

describe("cancelCheckIn", () => {
  it("cancels check-in through private API", async () => {
    await cancelCheckIn("user-1_class-1_2026-05-19");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/checkins/user-1_class-1_2026-05-19",
      { method: "DELETE" },
    );
  });

  it("throws API error message when cancel fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Prazo expirado" }),
    });

    await expect(cancelCheckIn("id")).rejects.toThrow("Prazo expirado");
  });
});

describe("createCheckIn", () => {
  it("creates check-in through private API", async () => {
    await createCheckIn("user-1", "plan-1", "class-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/checkins",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("includes classDateKey when provided", async () => {
    await createCheckIn("user-1", "plan-1", "class-1", "2026-06-01");

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      planId: "plan-1",
      classId: "class-1",
      classDateKey: "2026-06-01",
    });
  });

  it("throws API error message when available", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Turma lotada" }),
    });

    await expect(createCheckIn("u", "p", "c")).rejects.toThrow("Turma lotada");
  });

  it("throws generic message when response body is invalid", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("parse");
      },
    });

    await expect(createCheckIn("u", "p", "c")).rejects.toThrow(
      "Falha no check-in",
    );
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

  it("filters by lastDays option", async () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const old = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const mockDocs = [
      {
        id: "recent",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { toDate: () => recent },
        }),
      },
      {
        id: "old",
        data: () => ({
          userId: "user-1",
          planId: "plan-1",
          createdAt: { toDate: () => old },
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({ docs: mockDocs });

    const result = await fetchCheckinsByUser("user-1", { lastDays: 7 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("recent");
  });

  it("uses docs array when snapshot provides docs", async () => {
    const mockDocs = [
      {
        id: "d1",
        data: () => ({
          userId: "u",
          planId: "p",
          createdAt: { toDate: () => new Date(2026, 0, 2) },
        }),
      },
    ];
    mockGetDocs.mockResolvedValue({ docs: mockDocs });

    const result = await fetchCheckinsByUser("u");
    expect(result[0].id).toBe("d1");
  });
});

describe("listenCheckinsByUser", () => {
  it("subscribes and sorts check-ins descending", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, onNext: (snap: { docs: { id: string; data: () => object }[] }) => void) => {
        onNext({
          docs: [
            {
              id: "a",
              data: () => ({
                userId: "u",
                planId: "p",
                createdAt: { toDate: () => new Date(2026, 0, 1) },
              }),
            },
            {
              id: "b",
              data: () => ({
                userId: "u",
                planId: "p",
                createdAt: { toDate: () => new Date(2026, 0, 5) },
              }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenCheckinsByUser("user-1", onData);

    expect(mockOnSnapshot).toHaveBeenCalled();
    expect(onData.mock.calls[0][0][0].id).toBe("b");
    expect(onData.mock.calls[0][0][1].id).toBe("a");
  });
});
