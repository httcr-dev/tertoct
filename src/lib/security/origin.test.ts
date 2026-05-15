import { isDevTunnelHostname, isTrustedMutationRequest } from "./origin";

describe("isDevTunnelHostname", () => {
  it("matches ngrok hostnames", () => {
    expect(isDevTunnelHostname("abc.ngrok-free.app")).toBe(true);
    expect(isDevTunnelHostname("abc.ngrok-free.dev")).toBe(true);
    expect(isDevTunnelHostname("abc.ngrok.io")).toBe(true);
    expect(isDevTunnelHostname("abc.ngrok.app")).toBe(true);
  });

  it("rejects unrelated hosts", () => {
    expect(isDevTunnelHostname("evil.example.com")).toBe(false);
  });
});

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

  it("allows bare hostname in ALLOWED_ORIGINS", () => {
    process.env.ALLOWED_ORIGINS = "tertoct.vercel.app";
    const req = makeReq("https://app.example.com/api/x", {
      origin: "https://tertoct.vercel.app",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("rejects unknown origin in production", () => {
    const req = makeReq("https://app.example.com/api/x", {
      origin: "https://evil.example.com",
    });
    expect(isTrustedMutationRequest(req)).toBe(false);
  });

  it("allows ngrok origin when x-forwarded-host matches (localhost req.url)", () => {
    const req = makeReq("http://localhost:3000/api/auth/cookie", {
      origin: "https://abc.ngrok-free.app",
      host: "localhost:3000",
      "x-forwarded-host": "abc.ngrok-free.app",
      "x-forwarded-proto": "https",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("allows ngrok origin in development even without forwarded headers", () => {
    const req = makeReq("http://localhost:3000/api/auth/cookie", {
      origin: "https://abc.ngrok-free.app",
    });
    const prevEnv = process.env;
    process.env = { ...prevEnv, NODE_ENV: "development" };
    try {
      expect(isTrustedMutationRequest(req)).toBe(true);
    } finally {
      process.env = prevEnv;
    }
  });

  it("allows www origin when request URL is apex", () => {
    const req = makeReq("https://example.com/api/auth/cookie", {
      origin: "https://www.example.com",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });

  it("allows missing Origin when Sec-Fetch-Site is same-origin (production)", () => {
    const req = makeReq("https://app.example.com/api/auth/cookie", {
      "sec-fetch-site": "same-origin",
    });
    expect(isTrustedMutationRequest(req)).toBe(true);
  });
});
