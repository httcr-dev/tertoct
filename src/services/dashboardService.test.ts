export {};

const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn((...args: unknown[]) => ({ kind: "orderBy", args }));
const mockQuery = jest.fn((...args: unknown[]) => ({ kind: "query", args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ kind: "where", args }));

const mockMapPlan = jest.fn();
const mockMapStudentSummary = jest.fn();

const mockPlansCol = jest.fn(() => "plans-col");
const mockUsersCol = jest.fn(() => "users-col");
const mockProfilesCol = jest.fn(() => "profiles-col");

jest.mock("firebase/firestore", () => ({
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

jest.mock("@/lib/firestore/mappers", () => ({
  mapPlan: (...args: unknown[]) => mockMapPlan(...args),
  mapStudentSummary: (...args: unknown[]) => mockMapStudentSummary(...args),
}));

jest.mock("@/lib/firestore/refs", () => ({
  plansCol: () => mockPlansCol(),
  usersCol: () => mockUsersCol(),
  publicProfilesCol: () => mockProfilesCol(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

import {
  fetchAllStudentsForCoach,
  fetchCheckinCountsByCoach,
  fetchCheckinsForHistoryPeriod,
  fetchCurrentWeekCheckins,
  fetchRecentCheckinsSince,
  fetchStudentsForCoach,
  getCoachCheckinCountsPollIntervalMs,
  getCoachStudentsPollIntervalMs,
  listenCoaches,
  listenPlans,
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

  it("fetchStudentsForCoach loads paginated students", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        students: [{ id: "s1", name: "Ana" }],
        nextCursor: "cursor-1",
      }),
    });

    const page = await fetchStudentsForCoach({ limit: 50 });
    expect(page.students).toEqual([{ id: "s1", name: "Ana" }]);
    expect(page.nextCursor).toBe("cursor-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/private/users/students?limit=50",
      { credentials: "include" },
    );
  });

  it("fetchAllStudentsForCoach follows nextCursor pages", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          students: [{ id: "s1" }],
          nextCursor: "c1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          students: [{ id: "s2" }],
          nextCursor: null,
        }),
      });

    const students = await fetchAllStudentsForCoach();
    expect(students).toEqual([{ id: "s1" }, { id: "s2" }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("getCoachStudentsPollIntervalMs returns poll interval", () => {
    expect(getCoachStudentsPollIntervalMs()).toBe(60_000);
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

  it("listenCoaches maps email when present", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [
            {
              id: "c1",
              data: () => ({
                name: "Coach",
                email: "coach@test.local",
                photoURL: "https://coach.jpg",
                active: true,
              }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenCoaches(onData);

    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({
        email: "coach@test.local",
        photoURL: "https://coach.jpg",
      }),
    ]);
  });

  it("listenCoaches forwards snapshot errors", () => {
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, _onNext: unknown, onErr: (error: Error) => void) => {
        onErr(new Error("denied"));
        return () => undefined;
      },
    );

    listenCoaches(jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("fetchCheckinsForHistoryPeriod passes month range to private API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        checkins: [{ id: "m1", createdAt: "2026-03-15T12:00:00.000Z" }],
      }),
    });

    const result = await fetchCheckinsForHistoryPeriod({
      classDateKeyFrom: "2026-03-01",
      classDateKeyTo: "2026-03-31",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("fromDateKey=2026-03-01"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("toDateKey=2026-03-31"),
      expect.any(Object),
    );
    expect(result[0].id).toBe("m1");
    expect(result[0].createdAt).toEqual(new Date("2026-03-15T12:00:00.000Z"));
  });

  it("fetchCheckinsForHistoryPeriod passes week keys to private API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ checkins: [] }),
    });

    await fetchCheckinsForHistoryPeriod({
      classDateKeys: ["2026-03-23", "2026-03-24", "2026-03-25"],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("classDateKeys=2026-03-23"),
      expect.any(Object),
    );
  });

  it("fetchRecentCheckinsSince loads from private API", async () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        checkins: [{ id: "x1", createdAt: since.toISOString() }],
      }),
    });

    const result = await fetchRecentCheckinsSince(since);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/private/checkins/recent?"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result[0].id).toBe("x1");
    expect(result[0].createdAt).toEqual(since);
  });

  it("fetchCurrentWeekCheckins passes classDateKeys to private API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ checkins: [] }),
    });

    await fetchCurrentWeekCheckins(["2026-06-09", "2026-06-10"]);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("classDateKeys=2026-06-09%2C2026-06-10"),
      expect.any(Object),
    );
  });

  it("fetchCurrentWeekCheckins omits classDateKeys param when list is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ checkins: [] }),
    });

    await fetchCurrentWeekCheckins([]);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("days=7");
    expect(url).not.toContain("classDateKeys=");
  });

  it("fetchCheckinCountsByCoach maps API counts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ counts: { u1: 3, u2: 1 } }),
    });

    const counts = await fetchCheckinCountsByCoach(7);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/private/checkins/counts?days=7",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(counts.get("u1")).toBe(3);
    expect(counts.get("u2")).toBe(1);
  });

  it("fetchCheckinCountsByCoach throws when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchCheckinCountsByCoach()).rejects.toThrow(
      "Failed to load check-in counts",
    );
  });

  it("fetchCheckinCountsByCoach returns empty map when counts missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const counts = await fetchCheckinCountsByCoach();
    expect(counts.size).toBe(0);
  });

  it("getCoachCheckinCountsPollIntervalMs returns poll interval", () => {
    expect(getCoachCheckinCountsPollIntervalMs()).toBe(120_000);
  });

  it("fetchRecentCheckinsSince returns empty list when checkins is not an array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ checkins: null }),
    });
    await expect(fetchRecentCheckinsSince(new Date())).resolves.toEqual([]);
  });

  it("fetchStudentsForCoach throws when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchStudentsForCoach()).rejects.toThrow(
      "Failed to load students",
    );
  });

  it("listenCoaches includes active flag when present", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [
            {
              id: "c1",
              data: () => ({ name: "Coach", active: false }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenCoaches(onData);

    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "c1", active: false }),
    ]);
  });

  it("fetchRecentCheckinsSince throws when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchRecentCheckinsSince(new Date())).rejects.toThrow(
      "Failed to load check-ins",
    );
  });

  it("listenPlans forwards snapshot errors to handler", () => {
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, _onNext: unknown, onErr: (error: Error) => void) => {
        onErr(new Error("denied"));
        return () => undefined;
      },
    );

    listenPlans(jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
