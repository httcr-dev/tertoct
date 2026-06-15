export {};

const mockCookies = jest.fn();
const mockHeaders = jest.fn();
const mockVerifyToken = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
  headers: () => mockHeaders(),
}));

jest.mock("@/lib/auth/verifyToken", () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

import { getFastVerifyTokenOptions } from "./verifyTokenOptions";
import {
  encodeProxyAuthSession,
  PROXY_AUTH_SESSION_HEADER,
} from "./proxySessionHeaders";
import { clearRoleCache } from "./roleCache";
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
    clearRoleCache();
    mockVerifyToken.mockReset();
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "authToken" ? { value: "token-abc" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => null,
    });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false }),
        }),
      }),
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
      getFastVerifyTokenOptions(),
    );
  });

  it("uses proxy session header without re-verifying token", async () => {
    const encoded = encodeProxyAuthSession({ uid: "u1", role: "coach" } as never);
    mockHeaders.mockResolvedValueOnce({
      get: (name: string) =>
        name === PROXY_AUTH_SESSION_HEADER ? encoded : null,
    });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.role).toBe("coach");
      expect(result.context.session.uid).toBe("u1");
    }
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it("maps admin boolean claim to admin role", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", admin: true });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("admin");
  });

  it("prefers Firestore role over stale JWT claim", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "coach" });
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

  it("reads role from Firestore when JWT claim is missing", async () => {
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

  it("returns 503 when Firestore role lookup fails for privileged JWT role", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "coach" });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => {
            throw new Error("firestore unavailable");
          },
        }),
      }),
    });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it("falls back to JWT role when Firestore role lookup fails for student", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => {
            throw new Error("firestore unavailable");
          },
        }),
      }),
    });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("student");
  });

  it("uses strict verify for mutation requests", async () => {
    const { getPrivateRouteContextFromRequest } = await import("./privateRoute");
    const { getStrictVerifyTokenOptions } = await import("./verifyTokenOptions");
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });

    await getPrivateRouteContextFromRequest(
      new Request("http://localhost/api/private/plans", { method: "POST" }),
    );

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      getStrictVerifyTokenOptions(),
    );
  });

  it("uses fast verify for GET requests without proxy header", async () => {
    const { getPrivateRouteContextFromRequest } = await import("./privateRoute");
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });

    await getPrivateRouteContextFromRequest(
      new Request("http://localhost/api/private/checkins/counts", {
        method: "GET",
      }),
    );

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      getFastVerifyTokenOptions(),
    );
  });

  it("ignores proxy header when requireRevocationCheck is true", async () => {
    const encoded = encodeProxyAuthSession({ uid: "u1", role: "coach" } as never);
    mockHeaders.mockResolvedValueOnce({
      get: (name: string) =>
        name === PROXY_AUTH_SESSION_HEADER ? encoded : null,
    });
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });

    await getPrivateRouteContext({ requireRevocationCheck: true });

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      (await import("./verifyTokenOptions")).getStrictVerifyTokenOptions(),
    );
  });

  it("maps coach boolean claim to coach role", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", coach: true });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("coach");
  });

  it("maps student boolean claim to student role", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", student: true });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("student");
  });

  it("uses OPTIONS method with fast verify", async () => {
    const { getPrivateRouteContextFromRequest } = await import("./privateRoute");
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });

    await getPrivateRouteContextFromRequest(
      new Request("http://localhost/api/private/checkins/counts", {
        method: "OPTIONS",
      }),
    );

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      getFastVerifyTokenOptions(),
    );
  });

  it("returns 503 when Firestore lookup fails for admin JWT role", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", admin: true });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => {
            throw new Error("firestore unavailable");
          },
        }),
      }),
    });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it("keeps JWT role when Firestore user doc has no role field", async () => {
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "coach" });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({ name: "No role field" }),
          }),
        }),
      }),
    });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("coach");
  });

  it("uses strict verify for POST requests by default", async () => {
    const { getPrivateRouteContextFromRequest } = await import("./privateRoute");
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });

    await getPrivateRouteContextFromRequest(
      new Request("http://localhost/api/private/checkins/counts", {
        method: "POST",
      }),
    );

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      (await import("./verifyTokenOptions")).getStrictVerifyTokenOptions(),
    );
  });

  it("uses fast verify for HEAD requests", async () => {
    const { getPrivateRouteContextFromRequest } = await import("./privateRoute");
    mockVerifyToken.mockResolvedValueOnce({ uid: "u1", role: "student" });

    await getPrivateRouteContextFromRequest(
      new Request("http://localhost/api/private/checkins/counts", {
        method: "HEAD",
      }),
    );

    expect(mockVerifyToken).toHaveBeenCalledWith(
      "token-abc",
      getFastVerifyTokenOptions(),
    );
  });

  it("skips Firestore role lookup when session uid is missing", async () => {
    mockVerifyToken.mockResolvedValueOnce({ role: "coach" });

    const result = await getPrivateRouteContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe("coach");
  });

  it("reuses cached Firestore role within TTL", async () => {
    clearRoleCache();
    const getMock = jest.fn(async () => ({
      exists: true,
      data: () => ({ role: "student" }),
    }));
    mockVerifyToken.mockResolvedValue({ uid: "u1", role: "coach" });
    mockGetAdminFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({ get: getMock }),
      }),
    });

    const first = await getPrivateRouteContext();
    const second = await getPrivateRouteContext();

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.context.role).toBe("student");
      expect(second.context.role).toBe("student");
    }
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
