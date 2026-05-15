import { isTrustedMutationRequest } from "./origin";

describe("isTrustedMutationRequest", () => {
  const prev = process.env;

  beforeEach(() => {
    process.env = { ...prev, NODE_ENV: "production" };
    delete process.env.ALLOWED_ORIGINS;
  });

  afterAll(() => {
    process.env = prev;
  });

  function makeReq(url: string, headers: Record<string, string>) {
    return new Request(url, { method: "POST", headers });
  }

  it("allows same-origin requests", () => {
    const req = makeReq("https://app.example.com/api/x", {
      origin: "https://app.example.com",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("allows configured ALLOWED_ORIGINS when valid URL", () => {
    process.env.ALLOWED_ORIGINS = "https://other.example.com, not-a-url";
    const req = makeReq("https://app.example.com/api/x", {
      origin: "https://other.example.com",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("rejects unknown origin in production", () => {
    const req = makeReq("https://app.example.com/api/x", {
      origin: "https://evil.example.com",
    });
    expect(isTrustedMutationRequest(req)).toBe(false);
  });

  it("allows www origin when request URL is apex (and vice versa)", () => {
    const req = makeReq("https://example.com/api/auth/cookie", {
      origin: "https://www.example.com",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("allows origin matching x-forwarded-host when req.url host differs", () => {
    const req = makeReq("http://internal.local/api/auth/cookie", {
      origin: "https://app.example.com",
      host: "internal.local",
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "https",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("allows missing Origin when Sec-Fetch-Site is same-origin (production)", () => {
    const req = makeReq("https://app.example.com/api/auth/cookie", {
      "sec-fetch-site": "same-origin",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("rejects missing Origin in production when Sec-Fetch-Site is cross-site", () => {
    const req = makeReq("https://app.example.com/api/auth/cookie", {
      "sec-fetch-site": "cross-site",
    });
    expect(isTrustedMutationRequest(req)).toBe(false);
  });
});
