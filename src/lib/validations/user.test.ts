jest.mock("./sanitize", () => ({
  stripHtml: (input: string) =>
    typeof input === "string" ? input.replace(/<[^>]+>/g, "") : "",
}));

import { UserCreateSchema, UserUpdateSchema } from "./user";

describe("UserCreateSchema", () => {
  it("validates and sanitizes profile fields", () => {
    const result = UserCreateSchema.parse({
      name: "<b>João</b>",
      email: "joao@test.com",
      role: "student",
      active: true,
      paymentDueDay: 15,
    });

    expect(result.name).toBe("João");
    expect(result.email).toBe("joao@test.com");
    expect(result.role).toBe("student");
  });

  it("rejects invalid email", () => {
    expect(() =>
      UserCreateSchema.parse({
        name: "A",
        email: "bad",
        role: "student",
        active: true,
      }),
    ).toThrow();
  });
});

describe("UserUpdateSchema", () => {
  it("allows partial profile update", () => {
    expect(UserUpdateSchema.parse({ active: false })).toEqual({ active: false });
  });

  it("preserves null optional fields without stripHtml", () => {
    expect(
      UserUpdateSchema.parse({ planId: null, phone: null }),
    ).toEqual({ planId: null, phone: null });
  });

  it("sanitizes optional planId and phone when present", () => {
    expect(
      UserUpdateSchema.parse({
        planId: "plan-1",
        phone: "11999999999",
      }),
    ).toEqual({
      planId: "plan-1",
      phone: "11999999999",
    });
  });
});
