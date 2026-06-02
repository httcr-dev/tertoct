jest.mock("./sanitize", () => ({
  stripHtml: (input: string) =>
    typeof input === "string" ? input.replace(/<[^>]+>/g, "") : "",
  sanitizeHtml: (input: string) =>
    typeof input === "string" ? input.replace(/<script[^>]*>.*?<\/script>/gi, "") : "",
}));

import { PlanCreateSchema, PlanUpdateSchema } from "./plan";

describe("PlanCreateSchema", () => {
  it("accepts valid plan payload and strips HTML from name", () => {
    const result = PlanCreateSchema.parse({
      name: "<b>Plano</b> A",
      price: 99.9,
      classesPerWeek: 3,
      description: "<p>Descrição</p>",
      active: true,
    });

    expect(result.name).toBe("Plano A");
    expect(result.price).toBe(99.9);
    expect(result.description).toContain("Descrição");
  });

  it("rejects negative price", () => {
    expect(() =>
      PlanCreateSchema.parse({
        name: "X",
        price: -1,
        classesPerWeek: 1,
        active: true,
      }),
    ).toThrow();
  });
});

describe("PlanUpdateSchema", () => {
  it("allows partial updates", () => {
    const result = PlanUpdateSchema.parse({ active: false });
    expect(result).toEqual({ active: false });
  });
});
