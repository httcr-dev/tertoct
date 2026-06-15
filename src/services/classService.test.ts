export {};

const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn();
const mockQuery = jest.fn((...args: unknown[]) => ({ kind: "query", args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ kind: "where", args }));

const mockMapGymClass = jest.fn();
const mockClassesCol = jest.fn(() => "classes-col");
const mockClassCheckinCountersCol = jest.fn(() => "counters-col");

jest.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

jest.mock("@/lib/firestore/mappers", () => ({
  mapGymClass: (...args: unknown[]) => mockMapGymClass(...args),
}));

jest.mock("@/lib/firestore/refs", () => ({
  classesCol: () => mockClassesCol(),
  classCheckinCountersCol: () => mockClassCheckinCountersCol(),
}));

import {
  createGymClass,
  deleteGymClass,
  fetchClassCountersForDate,
  listenActiveClasses,
  listenClassCountersForDate,
  updateGymClass,
} from "./classService";

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  }) as unknown as typeof fetch;
  mockOnSnapshot.mockReturnValue(() => undefined);
});

describe("listenActiveClasses", () => {
  it("sorts active classes by start time", () => {
    const onData = jest.fn();
    mockMapGymClass
      .mockReturnValueOnce({ id: "c2", startTime: "18:00", name: "Noite" })
      .mockReturnValueOnce({ id: "c1", startTime: "07:00", name: "Manhã" });

    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, onNext: (snap: { docs: unknown[] }) => void) => {
        onNext({ docs: [{ id: "c2" }, { id: "c1" }] });
        return () => undefined;
      },
    );

    listenActiveClasses(onData);

    expect(mockWhere).toHaveBeenCalledWith("active", "==", true);
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "c1", startTime: "07:00" }),
      expect.objectContaining({ id: "c2", startTime: "18:00" }),
    ]);
  });
  it("listenActiveClasses forwards snapshot errors", () => {
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, _onNext: unknown, onErr: (error: Error) => void) => {
        onErr(new Error("permission denied"));
        return () => undefined;
      },
    );

    listenActiveClasses(jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("fetchClassCountersForDate", () => {
  it("builds map of classId to count", async () => {
    mockGetDocs.mockResolvedValueOnce({
      forEach: (cb: (d: { data: () => object }) => void) => {
        cb({ data: () => ({ classId: "c1", count: 3 }) });
        cb({ data: () => ({ classId: "c2", count: 1 }) });
        cb({ data: () => ({ classId: "", count: 5 }) });
        cb({ data: () => ({ classId: "c3", count: "x" }) });
        cb({ data: () => ({ classId: 99, count: 4 }) });
        cb({ data: () => ({ classId: null, count: 2 }) });
        cb({ data: () => null as unknown as object });
      },
    });

    const result = await fetchClassCountersForDate("2026-06-01");

    expect(mockWhere).toHaveBeenCalledWith("classDateKey", "==", "2026-06-01");
    expect(result.get("c1")).toBe(3);
    expect(result.get("c2")).toBe(1);
    expect(result.has("")).toBe(false);
    expect(result.get("c3")).toBe(0);
  });
});

describe("listenClassCountersForDate", () => {
  it("emits counter map on snapshot", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, onNext: (snap: { forEach: (cb: (d: { data: () => object }) => void) => void }) => void) => {
        onNext({
          forEach: (cb) => {
            cb({ data: () => ({ classId: 123, count: 2 }) });
            cb({ data: () => ({ classId: "c1", count: 2 }) });
            cb({ data: () => ({ count: 1 }) });
            cb({ data: () => undefined as unknown as object });
            cb({ data: () => ({ classId: "c2", count: "bad" }) });
          },
        });
        return () => undefined;
      },
    );

    listenClassCountersForDate("2026-06-01", onData);

    expect(onData.mock.calls[0][0].get("c1")).toBe(2);
  });

  it("listenClassCountersForDate forwards snapshot errors", () => {
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_q: unknown, _onNext: unknown, onErr: (error: Error) => void) => {
        onErr(new Error("denied"));
        return () => undefined;
      },
    );

    listenClassCountersForDate("2026-06-01", jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("class mutations via API", () => {
  it("createGymClass posts to private API", async () => {
    await createGymClass({
      name: "Turma",
      startTime: "07:00",
      checkinDeadlineTime: "06:45",
      capacity: 20,
      active: true,
      utcOffsetMinutes: -180,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/classes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updateGymClass patches class", async () => {
    await updateGymClass("class-1", { name: "Nova" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/classes/class-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deleteGymClass deletes class", async () => {
    await deleteGymClass("class-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/classes/class-1",
      { method: "DELETE" },
    );
  });

  it("throws when API returns error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(
      createGymClass({
        name: "X",
        startTime: "07:00",
        checkinDeadlineTime: "06:45",
        capacity: 10,
        active: true,
        utcOffsetMinutes: -180,
      }),
    ).rejects.toThrow("Falha ao criar turma");
  });

  it("throws when update API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(updateGymClass("class-1", { name: "Nova" })).rejects.toThrow(
      "Falha ao atualizar turma",
    );
  });

  it("throws when delete API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(deleteGymClass("class-1")).rejects.toThrow(
      "Falha ao excluir turma",
    );
  });
});
