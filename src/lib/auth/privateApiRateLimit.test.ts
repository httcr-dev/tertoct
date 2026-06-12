export {};

const mockCheckRateLimit = jest.fn();
const mockCheckRateLimitMemory = jest.fn();

jest.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/auth/rateLimitMemory", () => ({
  checkRateLimitMemory: (...args: unknown[]) => mockCheckRateLimitMemory(...args),
}));

import { enforcePrivateApiRateLimit } from "./privateApiRateLimit";

describe("enforcePrivateApiRateLimit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimitMemory.mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterMs: 0,
    });
  });

  it("uses in-memory limiter for GET requests", async () => {
    const req = new Request("http://localhost/api/private/users/students", {
      method: "GET",
    });

    const result = await enforcePrivateApiRateLimit(req, "coach-1");

    expect(result).toBeNull();
    expect(mockCheckRateLimitMemory).toHaveBeenCalledWith(
      expect.stringContaining("GET"),
      expect.objectContaining({ maxRequests: 300, failOpen: true }),
    );
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("uses Firestore limiter for POST mutations", async () => {
    const req = new Request("http://localhost/api/private/checkins", {
      method: "POST",
    });

    const result = await enforcePrivateApiRateLimit(req, "student-1");

    expect(result).toBeNull();
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("POST"),
      expect.objectContaining({ maxRequests: 10, failOpen: false }),
    );
    expect(mockCheckRateLimitMemory).not.toHaveBeenCalled();
  });

  it("returns 429 when in-memory GET limit is exceeded", async () => {
    mockCheckRateLimitMemory.mockReturnValue({
      allowed: false,
      retryAfterMs: 5000,
    });

    const req = new Request("http://localhost/api/private/checkins/counts", {
      method: "GET",
    });

    const result = await enforcePrivateApiRateLimit(req, "coach-1");

    expect(result?.status).toBe(429);
    expect(result?.headers.get("Retry-After")).toBe("5");
  });
});
