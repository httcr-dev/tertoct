import { clearRoleCache, getCachedUserRole, setCachedUserRole } from "./roleCache";

describe("roleCache", () => {
  beforeEach(() => {
    clearRoleCache();
  });

  it("stores and returns cached roles", () => {
    setCachedUserRole("u1", "coach");
    expect(getCachedUserRole("u1")).toBe("coach");
  });

  it("returns undefined for unknown users", () => {
    expect(getCachedUserRole("missing")).toBeUndefined();
  });
});
