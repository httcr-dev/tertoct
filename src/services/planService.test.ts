export {};

const mockGetDocs = jest.fn();
const mockQuery = jest.fn().mockReturnValue("plans-users-query");
const mockWhere = jest.fn().mockReturnValue("where-clause");
const mockLimit = jest.fn().mockReturnValue("limit-clause");

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  limit: (...args: any[]) => mockLimit(...args),
  serverTimestamp: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  getFirestoreDb: jest.fn().mockReturnValue("mock-db"),
}));

import {
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
  PlanInUseError,
} from "./planService";
import type { Plan } from "@/lib/types";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({ empty: true });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

describe("createPlan", () => {
  it("calls private API with normalized payload", async () => {
    await createPlan({
      name: "Plano A",
      price: 150,
      classesPerWeek: 3,
      description: "Desc",
      active: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/plans",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("defaults name to 'Novo Plano' when empty", async () => {
    await createPlan({
      name: "",
      price: 100,
      classesPerWeek: 2,
      active: true,
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it("defaults active to true and description to empty string when undefined", async () => {
    await createPlan({
      name: "Test",
      price: 50,
      classesPerWeek: 1,
    } as any);

    expect(global.fetch).toHaveBeenCalled();
  });
});

describe("updatePlan", () => {
  it("calls private update endpoint with fields", async () => {
    await updatePlan("plan-123", { name: "Updated", price: 200 });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/plans/plan-123",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("deletePlan", () => {
  it("calls delete endpoint when no users are linked", async () => {
    await deletePlan("plan-456");

    expect(mockQuery).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledWith("planId", "==", "plan-456");
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/private/plans/plan-456", {
      method: "DELETE",
    });
  });

  it("throws PlanInUseError and skips delete when linked users exist", async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: false });

    await expect(deletePlan("plan-456")).rejects.toBeInstanceOf(PlanInUseError);
    expect(global.fetch).not.toHaveBeenCalledWith("/api/private/plans/plan-456", {
      method: "DELETE",
    });
  });
});

describe("togglePlanActive", () => {
  it("calls toggle endpoint for active plan", async () => {
    const plan: Plan = {
      id: "plan-789",
      name: "Active Plan",
      price: 100,
      classesPerWeek: 2,
      active: true,
    };

    await togglePlanActive(plan);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/plans/plan-789/toggle",
      { method: "POST" },
    );
  });

  it("calls toggle endpoint for inactive plan", async () => {
    const plan: Plan = {
      id: "plan-101",
      name: "Inactive Plan",
      price: 100,
      classesPerWeek: 2,
      active: false,
    };

    await togglePlanActive(plan);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/plans/plan-101/toggle",
      { method: "POST" },
    );
  });
});
