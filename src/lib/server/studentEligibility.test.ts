import { assertActiveStudentWithPlan } from "./studentEligibility";

const mockGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: mockGet })),
    })),
  })),
}));

describe("assertActiveStudentWithPlan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects inactive users", async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ active: false, planId: "plan_1" }),
    });

    const result = await assertActiveStudentWithPlan("u1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects users without active plan", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ active: true, planId: "plan_1" }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ active: false }),
      });

    const result = await assertActiveStudentWithPlan("u1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows active users with active plan", async () => {
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ active: true, planId: "plan_1" }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ active: true }),
      });

    const result = await assertActiveStudentWithPlan("u1");
    expect(result).toEqual({ ok: true });
  });
});
