export {};

const mockGetDocs = jest.fn();
const mockQuery = jest.fn((...args: unknown[]) => ({ kind: "query", args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ kind: "where", args }));
const mockPlansCol = jest.fn(() => "plans-col-ref");
const mockMapPlan = jest.fn();

jest.mock("firebase/firestore", () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

jest.mock("@/lib/firestore/refs", () => ({
  plansCol: () => mockPlansCol(),
}));

jest.mock("@/lib/firestore/mappers", () => ({
  mapPlan: (...args: unknown[]) => mockMapPlan(...args),
}));

import { fetchActivePlans } from "./landingService";

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
