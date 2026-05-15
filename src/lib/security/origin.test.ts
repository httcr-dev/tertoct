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
});
