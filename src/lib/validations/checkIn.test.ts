import { CheckInCreateSchema } from "./checkIn";

describe("CheckInCreateSchema", () => {
  it("requires userId and planId", () => {
    expect(() => CheckInCreateSchema.parse({ userId: "", planId: "p" })).toThrow();
    expect(() => CheckInCreateSchema.parse({ userId: "u", planId: "" })).toThrow();
  });

  it("accepts valid payload", () => {
    expect(CheckInCreateSchema.parse({ userId: "u1", planId: "p1" })).toEqual({
      userId: "u1",
      planId: "p1",
    });
  });
});
