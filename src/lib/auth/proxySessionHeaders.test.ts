import {
  decodeProxyAuthSession,
  encodeProxyAuthSession,
  roleFromProxySession,
} from "./proxySessionHeaders";

describe("proxySessionHeaders", () => {
  it("round-trips session payload", () => {
    const encoded = encodeProxyAuthSession({
      uid: "user-1",
      role: "coach",
      exp: 123,
    } as never);

    const decoded = decodeProxyAuthSession(encoded);
    expect(decoded).toEqual({
      uid: "user-1",
      role: "coach",
      exp: 123,
    });
    expect(roleFromProxySession(decoded!)).toBe("coach");
  });

  it("returns null for invalid header", () => {
    expect(decodeProxyAuthSession("not-valid")).toBeNull();
  });
});
