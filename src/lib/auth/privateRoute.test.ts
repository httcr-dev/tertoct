export {};

const mockCookies = jest.fn();
const mockVerifyToken = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

jest.mock("@/lib/auth/verifyToken", () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

import { getVerifyTokenOptions } from "./verifyTokenOptions";
import {
  getPrivateRouteContext,
  requireRole,
  type PrivateRouteContext,
} from "./privateRoute";

describe("requireRole", () => {
  const base: PrivateRouteContext = {
    session: { uid: "u1" } as PrivateRouteContext["session"],
    role: "student",
  };

  it("returns null when role is allowed", () => {
    expect(requireRole(base, ["student"])).toBeNull();
  });

  it("returns 403 when role is missing", () => {
    const res = requireRole({ ...base, role: null }, ["student"]);
    expect(res?.status).toBe(403);
  });

  it("returns 403 when role is not in allowed list", () => {
    const res = requireRole({ ...base, role: "coach" }, ["admin"]);
    expect(res?.status).toBe(403);
  });
});

describe("getPrivateRouteContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "authToken" ? { value: "token-abc" } : undefined,
    });
  });

  it("returns 401 when cookie is missing", async () => {
    mockCookies.mockResolvedValueOnce({ get: () => undefined });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("returns context with role from session claim", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "coach" });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.role).toBe("coach");
      expect(result.context.session.uid).toBe("u1");
    }
    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      getVerifyTokenOptions(),
    );
  });

  it("maps admin boolean claim to admin role", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", admin: true });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("admin");
  });

  it("falls back to Firestore when role claim is missing", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1" });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ role: "student" }),
          }),
        }),
      }),
    });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("student");
  });

  it("returns 401 when token verification fails", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("invalid"));

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });
});
