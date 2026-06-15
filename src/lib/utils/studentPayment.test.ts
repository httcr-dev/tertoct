import type { StudentSummary } from "@/lib/types";
import { filterStudents } from "@/lib/utils/studentFilter";
import {
  getEffectiveDueDate,
  getStudentPaymentInfo,
  isMarkedPaid,
} from "./studentPayment";

const NOW = new Date(2025, 5, 10, 12, 0, 0);

const makeStudent = (overrides: Partial<StudentSummary> = {}): StudentSummary => ({
  id: "s1",
  name: "Aluno Teste",
  email: "aluno@test.com",
  weeklyCheckIns: 0,
  planId: "plan-1",
  paymentDueDay: 10,
  monthlyPaymentPaid: false,
  paymentValidUntil: null,
  ...overrides,
});

function legacyAdminJsonValidUntil(date: Date) {
  return {
    _seconds: Math.floor(date.getTime() / 1000),
    _nanoseconds: 0,
  };
}

describe("student payment helpers — API-serialized paymentValidUntil", () => {
  const futureValidUntil = new Date(2025, 6, 15, 23, 59, 59, 999);

  it.each([
    ["ISO string", futureValidUntil.toISOString()],
    ["admin JSON _seconds", legacyAdminJsonValidUntil(futureValidUntil)],
    ["client seconds object", { seconds: Math.floor(futureValidUntil.getTime() / 1000) }],
  ])("isMarkedPaid handles %s without throwing", (_label, paymentValidUntil) => {
    const student = makeStudent({ paymentValidUntil: paymentValidUntil as never });

    expect(() => isMarkedPaid(student, NOW)).not.toThrow();
    expect(isMarkedPaid(student, NOW)).toBe(true);
  });

  it.each([
    ["ISO string", futureValidUntil.toISOString()],
    ["admin JSON _seconds", legacyAdminJsonValidUntil(futureValidUntil)],
  ])("getStudentPaymentInfo handles %s", (_label, paymentValidUntil) => {
    const student = makeStudent({ paymentValidUntil: paymentValidUntil as never });

    expect(() => getStudentPaymentInfo(student, NOW)).not.toThrow();
    expect(getStudentPaymentInfo(student, NOW).situation).toMatch(/^Pago até/);
  });

  it.each([
    ["ISO string", futureValidUntil.toISOString()],
    ["admin JSON _seconds", legacyAdminJsonValidUntil(futureValidUntil)],
  ])("getEffectiveDueDate handles %s", (_label, paymentValidUntil) => {
    const student = makeStudent({ paymentValidUntil: paymentValidUntil as never });

    expect(() => getEffectiveDueDate(student, NOW)).not.toThrow();
    expect(getEffectiveDueDate(student, NOW)).toEqual(
      new Date(2025, 6, 15),
    );
  });

  it("filterStudents handles ISO paymentValidUntil from JSON round-trip", () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    try {
      const student = makeStudent({
        paymentValidUntil: futureValidUntil.toISOString(),
      });
      const fromApi = JSON.parse(JSON.stringify(student)) as StudentSummary;

      expect(() =>
        filterStudents([fromApi], {
          selectedPlanId: "all",
          paymentFilter: "paid",
        }),
      ).not.toThrow();
      expect(
        filterStudents([fromApi], {
          selectedPlanId: "all",
          paymentFilter: "paid",
        }),
      ).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("regression: legacy admin JSON has no toDate()", () => {
    const paymentValidUntil = legacyAdminJsonValidUntil(futureValidUntil);
    expect(
      typeof (paymentValidUntil as { toDate?: unknown }).toDate,
    ).not.toBe("function");
  });

  it("getStudentPaymentInfo shows overdue when unpaid and past due day", () => {
    const student = makeStudent({
      paymentDueDay: 5,
      monthlyPaymentPaid: false,
      paymentValidUntil: null,
    });
    expect(getStudentPaymentInfo(student, NOW).situation).toMatch(/^Atrasado/);
  });

  it("getEffectiveDueDate falls back to paymentDueDay when no validUntil", () => {
    const student = makeStudent({
      paymentDueDay: 15,
      monthlyPaymentPaid: true,
      paymentValidUntil: null,
    });
    expect(getEffectiveDueDate(student, NOW)).toEqual(new Date(2025, 6, 15));
  });
});
