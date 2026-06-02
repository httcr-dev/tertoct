export {};

const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn((...args: unknown[]) => ({ kind: "orderBy", args }));
const mockQuery = jest.fn((...args: unknown[]) => ({ kind: "query", args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ kind: "where", args }));
const mockTimestampFromDate = jest.fn((value: Date) => ({ toDate: () => value }));

const mockMapPlan = jest.fn();
const mockMapCheckin = jest.fn();

const mockPlansCol = jest.fn(() => "plans-col");
const mockUsersCol = jest.fn(() => "users-col");
const mockProfilesCol = jest.fn(() => "profiles-col");
const mockCheckinsCol = jest.fn(() => "checkins-col");

jest.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  Timestamp: {
    fromDate: (...args: unknown[]) => mockTimestampFromDate(...(args as [Date])),
  },
}));

jest.mock("@/lib/firestore/mappers", () => ({
  mapPlan: (...args: unknown[]) => mockMapPlan(...args),
  mapCheckin: (...args: unknown[]) => mockMapCheckin(...args),
}));

jest.mock("@/lib/firestore/refs", () => ({
  plansCol: () => mockPlansCol(),
  usersCol: () => mockUsersCol(),
  publicProfilesCol: () => mockProfilesCol(),
  checkinsCol: () => mockCheckinsCol(),
}));

import {
  fetchCheckinsByDateKeys,
  fetchCheckinsByDateRange,
  fetchCurrentWeekCheckins,
  fetchRecentCheckinsSince,
  listenCheckinCountsSince,
  listenCoaches,
  listenPlans,
  listenStudents,
} from "./dashboardService";

describe("dashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot.mockReturnValue(() => undefined);
  });

  it("listenPlans maps plan snapshots", () => {
    const onData = jest.fn();
    const docs = [{ id: "p1" }, { id: "p2" }];
    mockMapPlan.mockImplementation((d: { id: string }) => ({ id: d.id }));
    mockOnSnapshot.mockImplementationOnce((_queryRef: unknown, onNext: (snap: unknown) => void) => {
      onNext({ docs });
      return () => undefined;
    });

    listenPlans(onData);

    expect(mockOrderBy).toHaveBeenCalledWith("name", "asc");
    expect(onData).toHaveBeenCalledWith([{ id: "p1" }, { id: "p2" }]);
  });

  it("listenStudents normalizes nullable and active fields", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce((_queryRef: unknown, onNext: (snap: unknown) => void) => {
      onNext({
        docs: [
          {
            id: "s1",
            data: () => ({ name: "A", role: "student", active: true, monthlyPaymentPaid: true }),
          },
          {
            id: "s2",
            data: () => ({ role: "student" }),
          },
        ],
      });
      return () => undefined;
    });

    listenStudents(onData);

    expect(mockWhere).toHaveBeenCalledWith("role", "==", "student");
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "s1", name: "A", active: true, monthlyPaymentPaid: true }),
      expect.objectContaining({
        id: "s2",
        name: null,
        monthlyPaymentPaid: false,
      }),
    ]);
  });

  it("listenCoaches filters role query and maps defaults", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce((_queryRef: unknown, onNext: (snap: unknown) => void) => {
      onNext({
        docs: [
          { id: "c1", data: () => ({ name: "Coach", active: true }) },
          { id: "c2", data: () => ({}) },
        ],
      });
      return () => undefined;
    });

    listenCoaches(onData);

    expect(mockWhere).toHaveBeenCalledWith("role", "in", ["coach", "admin"]);
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "c1", name: "Coach", active: true }),
      expect.objectContaining({ id: "c2", name: null }),
    ]);
  });

  it("listenCheckinCountsSince counts checkins by user", () => {
    const onData = jest.fn();
    const since = new Date("2026-01-01T00:00:00.000Z");
    mockOnSnapshot.mockImplementationOnce((_queryRef: unknown, onNext: (snap: unknown) => void) => {
      onNext({
        forEach: (cb: (d: { data: () => { userId?: string } }) => void) => {
          cb({ data: () => ({ userId: "u1" }) });
          cb({ data: () => ({ userId: "u1" }) });
          cb({ data: () => ({ userId: "u2" }) });
          cb({ data: () => ({}) });
        },
      });
      return () => undefined;
    });

    listenCheckinCountsSince(since, onData);

    expect(mockTimestampFromDate).toHaveBeenCalledWith(since);
    const counts = onData.mock.calls[0][0] as Map<string, number>;
    expect(counts.get("u1")).toBe(2);
    expect(counts.get("u2")).toBe(1);
  });

  it("fetchRecentCheckinsSince maps docs", async () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    const docs = [{ id: "x1" }, { id: "x2" }];
    mockGetDocs.mockResolvedValueOnce({ docs });
    mockMapCheckin.mockImplementation((d: { id: string }) => ({ id: d.id }));

    const result = await fetchRecentCheckinsSince(since);

    expect(mockTimestampFromDate).toHaveBeenCalledWith(since);
    expect(result).toEqual([{ id: "x1" }, { id: "x2" }]);
  });

  it("fetchCheckinsByDateRange queries createdAt range", async () => {
    const start = new Date("2026-01-01");
    const end = new Date("2026-01-07");
    mockGetDocs.mockResolvedValueOnce({ docs: [{ id: "r1" }] });
    mockMapCheckin.mockImplementation((d: { id: string }) => ({ id: d.id }));

    const result = await fetchCheckinsByDateRange(start, end);

    expect(result).toEqual([{ id: "r1" }]);
    expect(mockWhere).toHaveBeenCalled();
  });

  it("fetchCheckinsByDateKeys returns empty for no keys", async () => {
    const result = await fetchCheckinsByDateKeys([]);
    expect(result).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it("fetchCheckinsByDateKeys uses single query for up to 5 keys", async () => {
    const keys = ["2026-06-01", "2026-06-02"];
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: "k1" }, { id: "k2" }],
    });
    mockMapCheckin.mockImplementation((d: { id: string }) => ({
      id: d.id,
      createdAt: new Date(2026, 5, Number(d.id.replace("k", ""))),
    }));

    const result = await fetchCheckinsByDateKeys(keys);

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it("fetchCheckinsByDateKeys batches more than 5 keys", async () => {
    const keys = Array.from({ length: 7 }, (_, i) => `2026-06-0${i + 1}`);
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [{ id: "a" }],
      })
      .mockResolvedValueOnce({
        docs: [{ id: "b" }],
      });
    mockMapCheckin.mockImplementation((d: { id: string }) => ({
      id: d.id,
      createdAt: d.id === "b" ? new Date(2026, 5, 10) : new Date(2026, 5, 1),
    }));

    const result = await fetchCheckinsByDateKeys(keys);

    expect(mockGetDocs).toHaveBeenCalledTimes(2);
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("a");
  });

  it("fetchCurrentWeekCheckins returns mapped checkins", async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [{ id: "w1" }] });
    mockMapCheckin.mockImplementation((d: { id: string }) => ({ id: d.id }));

    const result = await fetchCurrentWeekCheckins();

    expect(result).toEqual([{ id: "w1" }]);
  });
});
