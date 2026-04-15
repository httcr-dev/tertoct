export {};

import { assignPlan, setPaymentDay, togglePayment, toggleUserActive } from "./userService";
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

describe("assignPlan", () => {
  it("calls API with selected plan", async () => {
    await assignPlan("student-1", "plan-abc");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/users/student-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("calls API with null plan id", async () => {
    await assignPlan("student-1", null);

    expect(global.fetch).toHaveBeenCalled();
  });
});

describe("setPaymentDay", () => {
  it("calls API with payment day", async () => {
    await setPaymentDay("student-1", 15);

    expect(global.fetch).toHaveBeenCalled();
  });

  it("calls API when day is null", async () => {
    await setPaymentDay("student-1", null);

    expect(global.fetch).toHaveBeenCalled();
  });
});

describe("togglePayment", () => {
  it("calls API for payment toggle", async () => {
    await togglePayment({
      id: "student-1",
      name: "Test",
      email: "test@test.com",
      weeklyCheckIns: 0,
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe("toggleUserActive", () => {
  it("calls API for active toggle", async () => {
    await toggleUserActive("student-1", true);
    expect(global.fetch).toHaveBeenCalled();
  });
});
