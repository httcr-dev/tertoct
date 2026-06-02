import {
  endOfDueDayInMonth,
  isPaymentOverdue,
  isUnpaidPastDue,
} from "./payment";
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

describe("isUnpaidPastDue", () => {
  it("is overdue on day 1 when due day was 28 last month", () => {
    const now = new Date(2025, 5, 1, 12, 0, 0); // 1 Jun 2025
    expect(isUnpaidPastDue(28, now)).toBe(true);
  });

  it("is not overdue on the due day itself", () => {
    const now = new Date(2025, 5, 28, 12, 0, 0);
    expect(isUnpaidPastDue(28, now)).toBe(false);
  });

  it("is overdue the day after due day in the same month", () => {
    const now = new Date(2025, 5, 29, 12, 0, 0);
    expect(isUnpaidPastDue(28, now)).toBe(true);
  });

  it("is overdue mid-month when previous due passed", () => {
    const now = new Date(2025, 5, 15, 12, 0, 0);
    expect(isUnpaidPastDue(28, now)).toBe(true);
  });

  it("is overdue mid-month when previous month due passed (same rule as day 1)", () => {
    const now = new Date(2025, 4, 25, 12, 0, 0); // 25 May — April due passed
    expect(isUnpaidPastDue(28, now)).toBe(true);
  });
});

describe("endOfDueDayInMonth", () => {
  it("clamps due day to last day of February", () => {
    const end = endOfDueDayInMonth(2025, 1, 31);
    expect(end.getDate()).toBe(28);
    expect(end.getMonth()).toBe(1);
  });
});

describe("isPaymentOverdue", () => {
  it("returns false for null/undefined profile", () => {
    expect(isPaymentOverdue(null)).toBe(false);
    expect(isPaymentOverdue(undefined)).toBe(false);
  });

  it("returns false when no payment metadata is set", () => {
    const profile = makeProfile({
      paymentDueDay: undefined,
      monthlyPaymentPaid: undefined,
    });
    expect(isPaymentOverdue(profile)).toBe(false);
  });

  describe("with paymentValidUntil", () => {
    it("returns false when validUntil is ISO string in the future", () => {
      const now = new Date(2025, 5, 1, 12, 0, 0);
      const validUntil = endOfDueDayInMonth(2025, 6, 28).toISOString();
      const profile = makeProfile({
        paymentDueDay: 28,
        paymentValidUntil: validUntil,
      });
      expect(isPaymentOverdue(profile, now)).toBe(false);
    });

    it("returns false when validUntil is in the future", () => {
      const now = new Date(2025, 5, 1, 12, 0, 0);
      const validUntil = endOfDueDayInMonth(2025, 6, 28);
      const profile = makeProfile({
        paymentDueDay: 28,
        paymentValidUntil: { toDate: () => validUntil },
      });
      expect(isPaymentOverdue(profile, now)).toBe(false);
    });

    it("returns true when validUntil is in the past", () => {
      const now = new Date(2025, 5, 1, 12, 0, 0);
      const validUntil = endOfDueDayInMonth(2025, 4, 28);
      const profile = makeProfile({
        paymentDueDay: 28,
        paymentValidUntil: { toDate: () => validUntil },
      });
      expect(isPaymentOverdue(profile, now)).toBe(true);
    });

    it("returns false when validUntil string cannot be parsed", () => {
      const profile = makeProfile({
        paymentDueDay: 28,
        monthlyPaymentPaid: false,
        paymentValidUntil: "not-a-date",
      });
      const now = new Date(2025, 5, 29, 12, 0, 0);
      expect(isPaymentOverdue(profile, now)).toBe(false);
    });

    it("returns true when validUntil is a Date in the past", () => {
      const profile = makeProfile({
        paymentValidUntil: new Date(2020, 0, 1),
      });
      expect(isPaymentOverdue(profile, new Date(2025, 5, 1))).toBe(true);
    });
  });

  describe("paymentDueDay without paymentValidUntil", () => {
    it("returns true on day 1 with due day 28 and no payment", () => {
      const now = new Date(2025, 5, 1, 12, 0, 0);
      const profile = makeProfile({
        paymentDueDay: 28,
        monthlyPaymentPaid: false,
      });
      expect(isPaymentOverdue(profile, now)).toBe(true);
    });

    it("returns false on the due day without payment", () => {
      const now = new Date(2025, 5, 28, 12, 0, 0);
      const profile = makeProfile({
        paymentDueDay: 28,
        monthlyPaymentPaid: false,
      });
      expect(isPaymentOverdue(profile, now)).toBe(false);
    });

    it("returns true after due day in the month", () => {
      const now = new Date(2025, 5, 29, 12, 0, 0);
      const profile = makeProfile({
        paymentDueDay: 28,
        monthlyPaymentPaid: false,
      });
      expect(isPaymentOverdue(profile, now)).toBe(true);
    });

    it("returns false when monthlyPaymentPaid is true", () => {
      const now = new Date(2025, 5, 1, 12, 0, 0);
      const profile = makeProfile({
        paymentDueDay: 28,
        monthlyPaymentPaid: true,
      });
      expect(isPaymentOverdue(profile, now)).toBe(false);
    });
  });

  describe("fallback logic (no payment metadata)", () => {
    it("returns true when explicitly marked unpaid without due day", () => {
      const profile = makeProfile({
        paymentDueDay: null,
        monthlyPaymentPaid: false,
      });
      expect(isPaymentOverdue(profile)).toBe(true);
    });
  });
});
