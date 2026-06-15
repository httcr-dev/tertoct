export {};

const mockListCheckinsSince = jest.fn();
const mockGetPrivateRouteContext = jest.fn();
const mockEnforcePrivateApiRateLimit = jest.fn();

jest.mock("@/lib/server/checkinList", () => ({
  listCheckinsSince: (...args: unknown[]) => mockListCheckinsSince(...args),
}));

jest.mock("@/lib/auth/privateRoute", () => ({
  getPrivateRouteContextFromRequest: () => mockGetPrivateRouteContext(),
  requireRole: () => null,
}));

jest.mock("@/lib/auth/privateApiRateLimit", () => ({
  enforcePrivateApiRateLimit: () => mockEnforcePrivateApiRateLimit(),
}));

jest.mock("@/lib/observability/serverObservability", () => ({
  captureServerError: jest.fn(),
}));

function authOk() {
  mockGetPrivateRouteContext.mockResolvedValue({
    ok: true,
    context: { session: { uid: "coach-1" }, role: "coach" },
  });
}

describe("GET /api/private/checkins/recent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authOk();
    mockEnforcePrivateApiRateLimit.mockResolvedValue(null);
  });

  it("returns check-ins for a week via classDateKeys", async () => {
    mockListCheckinsSince.mockResolvedValue([
      { id: "c1", classDateKey: "2026-03-25" },
    ]);

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/private/checkins/recent?classDateKeys=2026-03-23,2026-03-24,2026-03-25",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkins: [{ id: "c1", classDateKey: "2026-03-25" }],
    });
    expect(mockListCheckinsSince).toHaveBeenCalledWith(
      expect.any(Date),
      expect.objectContaining({
        classDateKeys: ["2026-03-23", "2026-03-24", "2026-03-25"],
      }),
    );
  });

  it("returns check-ins for a month via fromDateKey and toDateKey", async () => {
    mockListCheckinsSince.mockResolvedValue([
      { id: "c2", classDateKey: "2026-03-15" },
    ]);

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/private/checkins/recent?fromDateKey=2026-03-01&toDateKey=2026-03-31",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkins: [{ id: "c2", classDateKey: "2026-03-15" }],
    });
    expect(mockListCheckinsSince).toHaveBeenCalledWith(
      expect.any(Date),
      expect.objectContaining({
        classDateKeyFrom: "2026-03-01",
        classDateKeyTo: "2026-03-31",
      }),
    );
  });
});
