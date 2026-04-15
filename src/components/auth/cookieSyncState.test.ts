import {
  CookieSyncState,
  initialCookieSyncState,
  shouldSyncCookie,
} from "./cookieSyncState";

describe("cookie sync state", () => {
  it("simulates token rotation and requires re-sync", () => {
    const firstState: CookieSyncState = {
      token: "token-v1",
      expiration: "2026-04-15T10:00:00.000Z",
    };
    const rotatedTokenState: CookieSyncState = {
      token: "token-v2",
      expiration: "2026-04-15T11:00:00.000Z",
    };

    expect(shouldSyncCookie(initialCookieSyncState, firstState)).toBe(true);
    expect(shouldSyncCookie(firstState, rotatedTokenState)).toBe(true);
  });

  it("requires re-sync when only expiration changes", () => {
    const previousState: CookieSyncState = {
      token: "token-v1",
      expiration: "2026-04-15T10:00:00.000Z",
    };
    const refreshedState: CookieSyncState = {
      token: "token-v1",
      expiration: "2026-04-15T11:00:00.000Z",
    };

    expect(shouldSyncCookie(previousState, refreshedState)).toBe(true);
  });

  it("does not sync again when token and expiration are unchanged", () => {
    const previousState: CookieSyncState = {
      token: "token-v1",
      expiration: "2026-04-15T10:00:00.000Z",
    };
    const sameState: CookieSyncState = {
      token: "token-v1",
      expiration: "2026-04-15T10:00:00.000Z",
    };

    expect(shouldSyncCookie(previousState, sameState)).toBe(false);
  });
});
