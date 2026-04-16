import { filterStudents } from "./studentFilter";
import type { StudentSummary } from "@/lib/types";

const makeStudent = (overrides: Partial<StudentSummary> = {}): StudentSummary => ({
  id: "s1",
  name: "Aluno Teste",
  email: "aluno@test.com",
  weeklyCheckIns: 0,
  planId: null,
  paymentDueDay: null,
  monthlyPaymentPaid: false,
  paymentValidUntil: null,
  ...overrides,
});

describe("filterStudents — planId filter", () => {
  const students = [
    makeStudent({ id: "a", planId: "plan-1" }),
    makeStudent({ id: "b", planId: "plan-2" }),
    makeStudent({ id: "c", planId: null }),
  ];

  it("returns all students when selectedPlanId is 'all'", () => {
    const result = filterStudents(students, { selectedPlanId: "all", paymentFilter: "all" });
    expect(result).toHaveLength(3);
  });

  it("returns only students with the specified planId", () => {
    const result = filterStudents(students, { selectedPlanId: "plan-1", paymentFilter: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("returns only students without a plan when selectedPlanId is 'none'", () => {
    const result = filterStudents(students, { selectedPlanId: "none", paymentFilter: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c");
  });

  it("returns empty array when no students match the planId", () => {
    const result = filterStudents(students, { selectedPlanId: "plan-999", paymentFilter: "all" });
    expect(result).toHaveLength(0);
  });
});

describe("filterStudents — paymentFilter", () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);

  const makeTimestamp = (d: Date) => ({
    toDate: () => d,
    seconds: Math.floor(d.getTime() / 1000),
  });

  const studentNoDueDay = makeStudent({ id: "no-due", paymentDueDay: null });
  const studentValid = makeStudent({
    id: "valid",
    paymentDueDay: 10,
    paymentValidUntil: makeTimestamp(futureDate) as any,
  });
  const studentNextMonth = makeStudent({
    id: "next-month",
    paymentDueDay: 10,
    paymentValidUntil: makeTimestamp(nextMonthDate) as any,
  });
  const studentExpired = makeStudent({
    id: "expired",
    paymentDueDay: 10,
    paymentValidUntil: makeTimestamp(pastDate) as any,
  });

  const all = [studentNoDueDay, studentValid, studentNextMonth, studentExpired];

  it("'all' returns all students regardless of payment", () => {
    const result = filterStudents(all, { selectedPlanId: "all", paymentFilter: "all" });
    expect(result).toHaveLength(4);
  });

  it("'none' returns only students without a due day", () => {
    const result = filterStudents(all, { selectedPlanId: "all", paymentFilter: "none" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("no-due");
  });

  it("'pending' returns expired students", () => {
    const result = filterStudents(all, { selectedPlanId: "all", paymentFilter: "pending" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("expired");
  });

  it("'paid' returns students with validUntil in next month", () => {
    const result = filterStudents(all, { selectedPlanId: "all", paymentFilter: "paid" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("next-month");
  });

  it("'active' returns students paid but expiring this month", () => {
    const result = filterStudents(all, { selectedPlanId: "all", paymentFilter: "active" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("valid");
  });
});

describe("filterStudents — combined filters", () => {
  it("applies both planId and paymentFilter simultaneously", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const makeTimestamp = (d: Date) => ({ toDate: () => d });

    const students = [
      makeStudent({ id: "match", planId: "plan-1", paymentDueDay: 10, paymentValidUntil: makeTimestamp(futureDate) as any }),
      makeStudent({ id: "wrong-plan", planId: "plan-2", paymentDueDay: 10, paymentValidUntil: makeTimestamp(futureDate) as any }),
      makeStudent({ id: "no-plan", planId: null }),
    ];

    const result = filterStudents(students, { selectedPlanId: "plan-1", paymentFilter: "active" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("match");
  });
});
