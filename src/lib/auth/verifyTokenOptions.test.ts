import {
  getFastVerifyTokenOptions,
  getStrictVerifyTokenOptions,
  getVerifyTokenOptions,
  shouldVerifyRevokedToken,
} from "./verifyTokenOptions";

describe("verifyTokenOptions", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: "test" };
    delete process.env.FIREBASE_CHECK_REVOKED;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  });

  afterAll(() => {
    process.env = env;
  });

  it("honours FIREBASE_CHECK_REVOKED=true", () => {
    process.env.FIREBASE_CHECK_REVOKED = "true";
    expect(shouldVerifyRevokedToken()).toBe(true);
  });

  it("disables revoked checks on emulators", () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    expect(shouldVerifyRevokedToken()).toBe(false);
  });

  it("uses fast verify by default for getVerifyTokenOptions", () => {
    expect(getVerifyTokenOptions()).toEqual({ checkRevoked: false });
    expect(getFastVerifyTokenOptions()).toEqual({ checkRevoked: false });
  });

  it("uses strict verify when revoked checks are enabled", () => {
    process.env.FIREBASE_CHECK_REVOKED = "true";
    expect(getStrictVerifyTokenOptions()).toEqual({ checkRevoked: true });
  });
});
