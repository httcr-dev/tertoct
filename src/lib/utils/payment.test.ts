import { isPaymentOverdue } from "./payment";
import type { AppUserProfile } from "@/lib/firebase";

function makeProfile(overrides: Partial<AppUserProfile> = {}): AppUserProfile {
  return {
    id: "user1",
    name: "Test User",
    email: "test@test.com",
    role: "student",
    active: true,
    ...overrides,
  };
}

describe("isPaymentOverdue", () => {
  it("returns false for null/undefined profile", () => {
    expect(isPaymentOverdue(null)).toBe(false);
    expect(isPaymentOverdue(undefined)).toBe(false);
  });

  it("returns false when no payment metadata is set", () => {
    const profile = makeProfile({ paymentDueDay: undefined, monthlyPaymentPaid: undefined });
    expect(isPaymentOverdue(profile)).toBe(false);
  });

  it("returns false when paymentDueDay is null and no explicit unpaid flag", () => {
    const profile = makeProfile({ paymentDueDay: null, monthlyPaymentPaid: undefined });
    expect(isPaymentOverdue(profile)).toBe(false);
  });

  describe("with paymentValidUntil (Timestamp-like)", () => {
    it("returns false when validUntil is in the future", () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const profile = makeProfile({
        paymentDueDay: 10,
        paymentValidUntil: {
          toDate: () => futureDate,
        },
      });
      expect(isPaymentOverdue(profile)).toBe(false);
    });

    it("returns true when validUntil is in the past", () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const profile = makeProfile({
        paymentDueDay: 10,
        paymentValidUntil: {
          toDate: () => pastDate,
        },
      });
      expect(isPaymentOverdue(profile)).toBe(true);
    });

    it("handles validUntil without toDate (raw date string)", () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const profile = makeProfile({
        paymentDueDay: 10,
        paymentValidUntil: futureDate.toISOString(),
      });
      expect(isPaymentOverdue(profile)).toBe(false);
    });

    it("handles validUntil parsing error and falls through to fallback", () => {
      const profile = makeProfile({
        paymentDueDay: 10,
        monthlyPaymentPaid: true,
        paymentValidUntil: {
          toDate: () => { throw new Error("bad timestamp"); },
        },
      });
      // Falls through to fallback — monthlyPaymentPaid is true, so not overdue
      expect(isPaymentOverdue(profile)).toBe(false);
    });
  });

  describe("fallback logic (no paymentValidUntil)", () => {
    it("returns false when monthlyPaymentPaid is true", () => {
      const profile = makeProfile({
        paymentDueDay: 1,
        monthlyPaymentPaid: true,
      });
      expect(isPaymentOverdue(profile)).toBe(false);
    });

    it("returns false when monthlyPaymentPaid is undefined", () => {
      const profile = makeProfile({
        paymentDueDay: 1,
        monthlyPaymentPaid: undefined,
      });
      expect(isPaymentOverdue(profile)).toBe(false);
    });

    it("returns true when explicitly marked unpaid without validUntil", () => {
      const profile = makeProfile({
        paymentDueDay: 31,
        monthlyPaymentPaid: false,
      });
      expect(isPaymentOverdue(profile)).toBe(true);
    });
  });
});
