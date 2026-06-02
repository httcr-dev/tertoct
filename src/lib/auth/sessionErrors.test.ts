import {
  isAuthRateLimitError,
  isFatalAuthSessionError,
} from "./sessionErrors";

describe("sessionErrors", () => {
  it("detects rate limit errors", () => {
    expect(isAuthRateLimitError(new Error("Sessão HTTP 429: Too many requests"))).toBe(
      true,
    );
  });

  it("does not treat rate limit as fatal", () => {
    expect(
      isFatalAuthSessionError(new Error("Sessão HTTP 429: Too many requests")),
    ).toBe(false);
  });

  it("treats 401 session errors as fatal", () => {
    expect(isFatalAuthSessionError(new Error("Sessão HTTP 401: Invalid token"))).toBe(
      true,
    );
  });
});
