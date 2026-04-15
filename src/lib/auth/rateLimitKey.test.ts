import { buildAuthRateLimitKey } from "./rateLimitKey";

describe("buildAuthRateLimitKey", () => {
  it("builds distinct keys for distinct clients", () => {
    const keyA = buildAuthRateLimitKey({
      route: "auth-cookie",
      method: "POST",
      clientId: "cid:a",
    });
    const keyB = buildAuthRateLimitKey({
      route: "auth-cookie",
      method: "POST",
      clientId: "cid:b",
    });

    expect(keyA).not.toBe(keyB);
  });

  it("includes uid for authenticated requests", () => {
    const keyWithUid = buildAuthRateLimitKey({
      route: "auth-verify",
      method: "POST",
      clientId: "cid:a",
      uid: "user-1",
    });
    const keyWithoutUid = buildAuthRateLimitKey({
      route: "auth-verify",
      method: "POST",
      clientId: "cid:a",
    });

    expect(keyWithUid).toContain(":uid:user-1");
    expect(keyWithUid).not.toBe(keyWithoutUid);
  });
});
