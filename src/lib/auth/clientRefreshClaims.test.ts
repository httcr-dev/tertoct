import {
  shouldRefreshAuthClaims,
} from "./clientRefreshClaims";

describe("shouldRefreshAuthClaims", () => {
  it("returns true when role claim is missing", () => {
    expect(shouldRefreshAuthClaims({}, "student")).toBe(true);
    expect(shouldRefreshAuthClaims(undefined, "coach")).toBe(true);
  });

  it("returns true when claim differs from Firestore role", () => {
    expect(
      shouldRefreshAuthClaims({ role: "coach" }, "student"),
    ).toBe(true);
  });

  it("returns false when claim matches profile", () => {
    expect(
      shouldRefreshAuthClaims({ role: "student" }, "student"),
    ).toBe(false);
  });
});
