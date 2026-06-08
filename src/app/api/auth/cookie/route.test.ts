export {};

const mockCookieSet = jest.fn();
const mockCookieDelete = jest.fn();
const mockCookies = jest.fn(async () => ({
  set: mockCookieSet,
  delete: mockCookieDelete,
}));

const mockVerifyToken = jest.fn();
const mockGetClientIdentifier = jest.fn(async () => "127.0.0.1");
const mockCheckRateLimit = jest.fn((...args: unknown[]) => {
  void args;
  return { allowed: true, remaining: 29, retryAfterMs: 0 };
});

jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

jest.mock("@/lib/auth/verifyToken", () => ({
  verifyToken: mockVerifyToken,
}));

jest.mock("@/lib/auth/clientIdentifier", () => ({
  getClientIdentifier: () => mockGetClientIdentifier(),
}));

jest.mock("@/lib/auth/rateLimitMemory", () => ({
  checkRateLimitMemory: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/security/origin", () => ({
  isTrustedMutationRequest: () => true,
}));

jest.mock("@/lib/auth/verifyTokenOptions", () => ({
  getFastVerifyTokenOptions: () => ({ checkRevoked: false }),
}));

describe("POST /api/auth/cookie", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ uid: "user-1" });
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 29, retryAfterMs: 0 });
  });

  it("returns 200 and sets cookie for valid token", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockVerifyToken).toHaveBeenCalledWith("valid-token", {
      checkRevoked: false,
    });
    expect(mockCookieSet).toHaveBeenCalledTimes(1);
  });

  it("returns 401 and never sets cookie for invalid token", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("Invalid token"));
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("returns 400 for empty payload token", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("returns 429 when global rate limit blocks request", async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0, retryAfterMs: 60_000 });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("returns 429 when uid rate limit blocks request", async () => {
    mockCheckRateLimit
      .mockReturnValueOnce({ allowed: true, remaining: 29, retryAfterMs: 0 })
      .mockReturnValueOnce({ allowed: false, remaining: 0, retryAfterMs: 60_000 });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mockVerifyToken).toHaveBeenCalledWith("valid-token", {
      checkRevoked: false,
    });
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
