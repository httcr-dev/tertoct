export {};

const mockListStudentsPage = jest.fn();
const mockGetPrivateRouteContext = jest.fn();
const mockEnforcePrivateApiRateLimit = jest.fn();

jest.mock("@/lib/server/studentList", () => {
  const actual = jest.requireActual<typeof import("@/lib/server/studentList")>(
    "@/lib/server/studentList",
  );
  return {
    ...actual,
    listStudentsPage: (...args: unknown[]) => mockListStudentsPage(...args),
  };
});

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

describe("GET /api/private/users/students", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authOk();
    mockEnforcePrivateApiRateLimit.mockResolvedValue(null);
  });

  it("returns paginated students", async () => {
    mockListStudentsPage.mockResolvedValue({
      students: [{ id: "s1", name: "Ana" }],
      nextCursor: null,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/private/users/students?limit=50"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      students: [{ id: "s1", name: "Ana" }],
      nextCursor: null,
    });
    expect(mockListStudentsPage).toHaveBeenCalledWith({
      limit: 50,
      cursor: undefined,
    });
  });

  it("returns 400 for invalid cursor errors", async () => {
    mockListStudentsPage.mockRejectedValue(new Error("Invalid cursor"));

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/private/users/students"),
    );

    expect(response.status).toBe(400);
  });

  it("returns JSON-safe paymentValidUntil for coach client", async () => {
    const validUntil = new Date(2025, 6, 15, 23, 59, 59, 999);
    mockListStudentsPage.mockResolvedValue({
      students: [
        {
          id: "s1",
          name: "Ana",
          email: null,
          phone: null,
          photoURL: null,
          planId: "plan-1",
          weeklyCheckIns: 0,
          paymentDueDay: 10,
          monthlyPaymentPaid: true,
          paymentValidUntil: validUntil.toISOString(),
        },
      ],
      nextCursor: null,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/private/users/students"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.students[0].paymentValidUntil).toBe(validUntil.toISOString());
    expect(
      typeof (body.students[0].paymentValidUntil as { toDate?: unknown }).toDate,
    ).not.toBe("function");
  });
});
