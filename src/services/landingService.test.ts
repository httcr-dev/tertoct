export {};

const mockGetDocs = jest.fn();
const mockQuery = jest.fn((...args: unknown[]) => ({ kind: "query", args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ kind: "where", args }));
const mockPlansCol = jest.fn(() => "plans-col-ref");
const mockProfilesCol = jest.fn(() => "profiles-col-ref");
const mockMapPlan = jest.fn();

jest.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

jest.mock("@/lib/firestore/refs", () => ({
  plansCol: () => mockPlansCol(),
  publicProfilesCol: () => mockProfilesCol(),
}));

jest.mock("@/lib/firestore/mappers", () => ({
  mapPlan: (...args: unknown[]) => mockMapPlan(...args),
}));

import { fetchActiveCoaches, fetchActivePlans } from "./landingService";

describe("fetchActivePlans", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns plans sorted by classesPerWeek", async () => {
    const docs = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    mockGetDocs.mockResolvedValueOnce({ docs });
    mockMapPlan
      .mockReturnValueOnce({ id: "p1", classesPerWeek: 5 })
      .mockReturnValueOnce({ id: "p2", classesPerWeek: 2 })
      .mockReturnValueOnce({ id: "p3", classesPerWeek: 3 });

    const result = await fetchActivePlans();

    expect(mockPlansCol).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledWith("active", "==", true);
    expect(result.map((p: { id: string }) => p.id)).toEqual(["p2", "p3", "p1"]);
  });
});

describe("fetchActiveCoaches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns active coaches/admins and normalizes nullable fields", async () => {
    const docs = [
      {
        id: "c1",
        data: () => ({ name: "Coach 1", active: true, bio: "A", photoURL: "u1" }),
      },
      {
        id: "c2",
        data: () => ({ name: null, active: false, bio: "B", photoURL: "u2" }),
      },
      {
        id: "c3",
        data: () => ({ active: undefined }),
      },
    ];

    mockGetDocs.mockResolvedValueOnce({
      forEach: (cb: (docSnap: (typeof docs)[number]) => void) => docs.forEach(cb),
    });

    const result = await fetchActiveCoaches();

    expect(mockProfilesCol).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledWith("role", "in", ["coach", "admin"]);
    expect(result).toEqual([
      { id: "c1", name: "Coach 1", bio: "A", photoURL: "u1" },
      { id: "c3", name: null, bio: undefined, photoURL: undefined },
    ]);
  });
});
