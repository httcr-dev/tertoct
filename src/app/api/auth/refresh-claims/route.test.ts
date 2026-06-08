export {};

const mockGetPrivateRouteContext = jest.fn();
const mockSyncCustomClaims = jest.fn();

jest.mock("@/lib/auth/privateRoute", () => ({
  getPrivateRouteContextFromRequest: () => mockGetPrivateRouteContext(),
}));

jest.mock("@/lib/auth/customClaims", () => ({
  syncCustomClaimsFromFirestore: (...args: unknown[]) =>
    mockSyncCustomClaims(...args),
}));

jest.mock("@/lib/security/origin", () => ({
  isTrustedMutationRequest: () => true,
}));

describe("POST /api/auth/refresh-claims", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrivateRouteContext.mockResolvedValue({
      ok: true,
      context: { session: { uid: "user-1" }, role: "student" },
    });
    mockSyncCustomClaims.mockResolvedValue("student");
  });

  it("returns 200 when claims sync succeeds", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/refresh-claims", {
        method: "POST",
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, role: "student" });
    expect(mockSyncCustomClaims).toHaveBeenCalledWith("user-1");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetPrivateRouteContext.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/refresh-claims", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });
});
