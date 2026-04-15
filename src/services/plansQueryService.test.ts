export {};

const mockGetDoc = jest.fn();
const mockPlanDoc = jest.fn((planId: string) => `plan-doc-${planId}`);
const mockMapPlan = jest.fn();

jest.mock("firebase/firestore", () => ({
  getDoc: mockGetDoc,
}));

jest.mock("@/lib/firestore/refs", () => ({
  planDoc: mockPlanDoc,
}));

jest.mock("@/lib/firestore/mappers", () => ({
  mapPlan: mockMapPlan,
}));

import { getPlanById } from "./plansQueryService";

describe("getPlanById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when document does not exist", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
    });

    const result = await getPlanById("p1");

    expect(mockPlanDoc).toHaveBeenCalledWith("p1");
    expect(mockGetDoc).toHaveBeenCalledWith("plan-doc-p1");
    expect(result).toBeNull();
    expect(mockMapPlan).not.toHaveBeenCalled();
  });

  it("maps and returns plan when document exists", async () => {
    const snap = {
      id: "p2",
      exists: () => true,
      data: () => ({ name: "Plano 2" }),
    };
    const mapped = {
      id: "p2",
      name: "Plano 2",
      price: 100,
      classesPerWeek: 3,
      active: true,
    };
    mockGetDoc.mockResolvedValueOnce(snap);
    mockMapPlan.mockReturnValueOnce(mapped);

    const result = await getPlanById("p2");

    expect(mockMapPlan).toHaveBeenCalledWith(snap);
    expect(result).toEqual(mapped);
  });
});
