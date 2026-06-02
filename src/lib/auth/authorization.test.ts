import {
  getUserRoles,
  isAuthorizedForPath,
} from "./authorization";
import type { DecodedIdToken } from "firebase-admin/auth";

function session(claims: Record<string, unknown>): DecodedIdToken {
  return claims as DecodedIdToken;
}

describe("getUserRoles", () => {
  it("includes role string claim", () => {
    expect(getUserRoles(session({ role: "coach" }))).toEqual(
      expect.arrayContaining(["coach"]),
    );
  });

  it("includes boolean custom claims", () => {
    expect(getUserRoles(session({ admin: true, coach: true }))).toEqual(
      expect.arrayContaining(["admin", "coach"]),
    );
  });

  it("ignores empty role string", () => {
    const roles = getUserRoles(session({ role: "" }));
    expect(roles).not.toContain("");
  });
});

describe("isAuthorizedForPath", () => {
  it("allows unprotected paths without role checks", () => {
    expect(
      isAuthorizedForPath("/dashboard/student", session({ role: "student" })),
    ).toBe(true);
  });

  it("denies admin dashboard for coach without admin", () => {
    expect(
      isAuthorizedForPath("/dashboard/admin", session({ role: "coach" })),
    ).toBe(false);
  });

  it("allows admin dashboard for admin role", () => {
    expect(
      isAuthorizedForPath("/dashboard/admin", session({ role: "admin" })),
    ).toBe(true);
  });

  it("allows coach dashboard for admin", () => {
    expect(
      isAuthorizedForPath("/dashboard/coach", session({ role: "admin" })),
    ).toBe(true);
  });

  it("allows coach dashboard for coach claim", () => {
    expect(
      isAuthorizedForPath("/dashboard/coach", session({ coach: true })),
    ).toBe(true);
  });

  it("protects private admin API prefix", () => {
    expect(
      isAuthorizedForPath(
        "/api/private/admin/users",
        session({ role: "coach" }),
      ),
    ).toBe(false);
    expect(
      isAuthorizedForPath(
        "/api/private/admin/users",
        session({ role: "admin" }),
      ),
    ).toBe(true);
  });
});
