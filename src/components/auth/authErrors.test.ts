import {
  isVercelPreviewHostname,
  mapAuthError,
  pendingSignInFailureMessage,
} from "./authErrors";

describe("isVercelPreviewHostname", () => {
  it("detects Vercel deployment preview URLs", () => {
    expect(
      isVercelPreviewHostname("tertoct-qyg4yzjay-heitorcrs-projects.vercel.app"),
    ).toBe(true);
    expect(isVercelPreviewHostname("tertoct-git-main-user.vercel.app")).toBe(
      true,
    );
  });

  it("does not flag production Vercel alias", () => {
    expect(isVercelPreviewHostname("tertoct.vercel.app")).toBe(false);
  });
});

describe("mapAuthError", () => {
  it("includes hostname for unauthorized-domain when window is available", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { location: { hostname: "tertoct.vercel.app" } },
      configurable: true,
    });
    try {
      const msg = mapAuthError({ code: "auth/unauthorized-domain" });
      expect(msg).toContain("tertoct.vercel.app");
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});

describe("pendingSignInFailureMessage", () => {
  it("hints preview URLs", () => {
    const msg = pendingSignInFailureMessage(
      "tertoct-qyg4yzjay-heitorcrs-projects.vercel.app",
    );
    expect(msg).toContain("produção");
  });
});
