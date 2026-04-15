export {};

const mockVerifyToken = jest.fn();
const mockGetClientIdentifier = jest.fn(async () => "cid:test");
const mockCheckRateLimit = jest.fn();

jest.mock("@/lib/auth/verifyToken", () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

jest.mock("@/lib/auth/clientIdentifier", () => ({
  getClientIdentifier: () => mockGetClientIdentifier(),
}));

jest.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

describe("POST /api/auth/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockVerifyToken.mockResolvedValue({ uid: "user-1" });
  });

  it("returns 200 for valid token", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("returns 400 for empty payload", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for token with invalid type", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: 123 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 429 on global rate-limit", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
  });

  it("returns 429 on uid rate-limit", async () => {
    mockCheckRateLimit
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
  });

  it("returns 401 for invalid token", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("invalid"));
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
