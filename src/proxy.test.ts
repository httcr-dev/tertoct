export {};

const mockVerifyToken = jest.fn();
const mockIsAuthorizedForPath = jest.fn();
const mockTrackStatusAnomaly = jest.fn();
const mockCaptureServerError = jest.fn();
const mockLogServerEvent = jest.fn();

jest.mock("@/lib/auth/verifyToken", () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

jest.mock("@/lib/auth/authorization", () => ({
  isAuthorizedForPath: (...args: unknown[]) => mockIsAuthorizedForPath(...args),
}));

jest.mock("@/lib/observability/serverObservability", () => ({
  trackStatusAnomaly: (...args: unknown[]) => mockTrackStatusAnomaly(...args),
  captureServerError: (...args: unknown[]) => mockCaptureServerError(...args),
  logServerEvent: (...args: unknown[]) => mockLogServerEvent(...args),
}));

function makeRequest(pathname: string, token?: string) {
  return {
    url: `https://test.local${pathname}`,
    nextUrl: { pathname },
    headers: new Headers(),
    cookies: {
      get: () => (token ? { value: token } : undefined),
    },
  } as any;
}

describe("proxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthorizedForPath.mockReturnValue(true);
  });

  it("returns 401 for protected API without cookie", async () => {
    const { proxy } = await import("./proxy");
    const response = await proxy(makeRequest("/api/private/admin/resource"));

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src 'self' 'nonce-");
    expect(response.headers.get("Content-Security-Policy")).not.toContain("'unsafe-inline'");
  });

  it("redirects page request without cookie to home", async () => {
    const { proxy } = await import("./proxy");
    const response = await proxy(makeRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://test.local/");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src 'self' 'nonce-");
  });

  it("returns 401 for invalid/revoked token", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("revoked"));
    const { proxy } = await import("./proxy");
    const response = await proxy(makeRequest("/api/private/coach/resource", "bad-token"));

    expect(response.status).toBe(401);
    expect(mockCaptureServerError).toHaveBeenCalled();
  });

  it("returns 403 when role is insufficient", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });
    mockIsAuthorizedForPath.mockReturnValueOnce(false);
    const { proxy } = await import("./proxy");
    const response = await proxy(makeRequest("/api/private/admin/resource", "valid-token"));

    expect(response.status).toBe(403);
    expect(mockLogServerEvent).toHaveBeenCalled();
  });

  it("redirects page request with insufficient role to dashboard", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });
    mockIsAuthorizedForPath.mockReturnValueOnce(false);
    const { proxy } = await import("./proxy");
    const response = await proxy(makeRequest("/dashboard/admin", "valid-token"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://test.local/dashboard");
  });

  it("adds nonce CSP on non-protected routes", async () => {
    const { proxy } = await import("./proxy");
    const response = await proxy(makeRequest("/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-nonce")).toBeTruthy();
    expect(response.headers.get("Content-Security-Policy")).toContain("style-src 'self' 'nonce-");
  });
});
