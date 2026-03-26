// Mock firebase/firestore before imports
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockCollection = jest.fn().mockReturnValue("plans-collection-ref");
const mockDoc = jest.fn().mockReturnValue("plan-doc-ref");
const mockServerTimestamp = jest.fn().mockReturnValue("SERVER_TIMESTAMP");

jest.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock("@/lib/firebase", () => ({
  getFirestoreDb: jest.fn().mockReturnValue("mock-db"),
}));

import { createPlan, updatePlan, deletePlan, togglePlanActive } from "./planService";
import type { Plan } from "@/lib/types";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createPlan", () => {
  it("calls addDoc with correct data and serverTimestamp", async () => {
    await createPlan({
      name: "Plano A",
      price: 150,
      classesPerWeek: 3,
      description: "Desc",
      active: true,
    });

    expect(mockCollection).toHaveBeenCalledWith("mock-db", "plans");
    expect(mockAddDoc).toHaveBeenCalledWith("plans-collection-ref", {
      name: "Plano A",
      price: 150,
      classesPerWeek: 3,
      description: "Desc",
      active: true,
      createdAt: "SERVER_TIMESTAMP",
    });
  });

  it("defaults name to 'Novo Plano' when empty", async () => {
    await createPlan({
      name: "",
      price: 100,
      classesPerWeek: 2,
      active: true,
    });

    expect(mockAddDoc).toHaveBeenCalledWith("plans-collection-ref", {
      name: "Novo Plano",
      price: 100,
      classesPerWeek: 2,
      description: "",
      active: true,
      createdAt: "SERVER_TIMESTAMP",
    });
  });

  it("defaults active to true and description to empty string when undefined", async () => {
    await createPlan({
      name: "Test",
      price: 50,
      classesPerWeek: 1,
    } as any);

    expect(mockAddDoc).toHaveBeenCalledWith("plans-collection-ref", {
      name: "Test",
      price: 50,
      classesPerWeek: 1,
      description: "",
      active: true,
      createdAt: "SERVER_TIMESTAMP",
    });
  });
});

describe("updatePlan", () => {
  it("calls updateDoc with the plan doc ref and fields", async () => {
    await updatePlan("plan-123", { name: "Updated", price: 200 });

    expect(mockDoc).toHaveBeenCalledWith("mock-db", "plans", "plan-123");
    expect(mockUpdateDoc).toHaveBeenCalledWith("plan-doc-ref", {
      name: "Updated",
      price: 200,
    });
  });
});

describe("deletePlan", () => {
  it("calls deleteDoc with the plan doc ref", async () => {
    await deletePlan("plan-456");

    expect(mockDoc).toHaveBeenCalledWith("mock-db", "plans", "plan-456");
    expect(mockDeleteDoc).toHaveBeenCalledWith("plan-doc-ref");
  });
});

describe("togglePlanActive", () => {
  it("sets active to false when plan is currently active", async () => {
    const plan: Plan = {
      id: "plan-789",
      name: "Active Plan",
      price: 100,
      classesPerWeek: 2,
      active: true,
    };

    await togglePlanActive(plan);

    expect(mockDoc).toHaveBeenCalledWith("mock-db", "plans", "plan-789");
    expect(mockUpdateDoc).toHaveBeenCalledWith("plan-doc-ref", {
      active: false,
    });
  });

  it("sets active to true when plan is currently inactive", async () => {
    const plan: Plan = {
      id: "plan-101",
      name: "Inactive Plan",
      price: 100,
      classesPerWeek: 2,
      active: false,
    };

    await togglePlanActive(plan);

    expect(mockUpdateDoc).toHaveBeenCalledWith("plan-doc-ref", {
      active: true,
    });
  });
});
