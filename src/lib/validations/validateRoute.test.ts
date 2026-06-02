import { z } from "zod";
import { validateBody } from "./validateRoute";

const schema = z.object({
  name: z.string().min(1),
});

describe("validateBody", () => {
  it("returns parsed data for valid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    const { data, errorResponse } = await validateBody(req, schema);

    expect(errorResponse).toBeUndefined();
    expect(data).toEqual({ name: "Test" });
  });

  it("returns 400 with Zod issues for invalid payload", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });

    const { data, errorResponse } = await validateBody(req, schema);

    expect(data).toBeUndefined();
    expect(errorResponse?.status).toBe(400);
    const body = await errorResponse!.json();
    expect(body.error).toBe("Bad Request");
    expect(body.details).toBeDefined();
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    });

    const { errorResponse } = await validateBody(req, schema);

    expect(errorResponse?.status).toBe(400);
    const body = await errorResponse!.json();
    expect(body.details).toBe("Invalid JSON body");
  });
});
