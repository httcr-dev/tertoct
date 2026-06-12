import { parseApiErrorMessage } from "./parseApiError";

describe("parseApiErrorMessage", () => {
  it("returns server error message when present", async () => {
    const response = {
      json: async () => ({ error: "Conta desativada" }),
    } as Response;

    await expect(parseApiErrorMessage(response, "fallback")).resolves.toBe(
      "Conta desativada",
    );
  });

  it("returns fallback when body has no error field", async () => {
    const response = {
      json: async () => ({}),
    } as Response;

    await expect(parseApiErrorMessage(response, "fallback")).resolves.toBe(
      "fallback",
    );
  });

  it("returns fallback when error field is empty", async () => {
    const response = {
      json: async () => ({ error: "" }),
    } as Response;

    await expect(parseApiErrorMessage(response, "fallback")).resolves.toBe(
      "fallback",
    );
  });

  it("returns fallback when response body is null", async () => {
    const response = {
      json: async () => null,
    } as Response;

    await expect(parseApiErrorMessage(response, "fallback")).resolves.toBe(
      "fallback",
    );
  });

  it("returns fallback when json parsing fails", async () => {
    const response = {
      json: async () => {
        throw new Error("invalid json");
      },
    } as Response;

    await expect(parseApiErrorMessage(response, "fallback")).resolves.toBe(
      "fallback",
    );
  });
});
