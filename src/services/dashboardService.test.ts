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
});
