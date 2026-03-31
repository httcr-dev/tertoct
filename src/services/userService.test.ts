// Mock firebase/firestore before imports
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn().mockReturnValue("user-doc-ref");
const mockDeleteField = jest.fn().mockReturnValue("DELETE_FIELD_SENTINEL");
const mockTimestampFromDate = jest.fn().mockReturnValue("TIMESTAMP_VALUE");

jest.mock("firebase/firestore", () => ({
  doc: (...args: any[]) => mockDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteField: () => mockDeleteField(),
  Timestamp: {
    fromDate: (d: Date) => mockTimestampFromDate(d),
  },
}));

jest.mock("@/lib/firebase", () => ({
  getFirestoreDb: jest.fn().mockReturnValue("mock-db"),
}));

import { assignPlan, setPaymentDay, togglePayment, toggleUserActive } from "./userService";
import type { StudentSummary } from "@/lib/types";

function makeStudent(overrides: Partial<StudentSummary> = {}): StudentSummary {
  return {
    id: "student-1",
    name: "Test Student",
    email: "test@test.com",
    weeklyCheckIns: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assignPlan", () => {
  it("sets planId when given a valid planId", async () => {
    await assignPlan("student-1", "plan-abc");

    expect(mockDoc).toHaveBeenCalledWith("mock-db", "users", "student-1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      planId: "plan-abc",
      active: true,
    });
  });

  it("uses deleteField when planId is null", async () => {
    await assignPlan("student-1", null);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      planId: "DELETE_FIELD_SENTINEL",
      paymentValidUntil: "DELETE_FIELD_SENTINEL",
      monthlyPaymentPaid: "DELETE_FIELD_SENTINEL",
      paymentDueDay: "DELETE_FIELD_SENTINEL",
      active: false,
    });
  });

  it("uses deleteField when planId is empty string", async () => {
    await assignPlan("student-1", "");

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      planId: "DELETE_FIELD_SENTINEL",
      paymentValidUntil: "DELETE_FIELD_SENTINEL",
      monthlyPaymentPaid: "DELETE_FIELD_SENTINEL",
      paymentDueDay: "DELETE_FIELD_SENTINEL",
      active: false,
    });
  });
});

describe("setPaymentDay", () => {
  it("sets paymentDueDay when given a valid day", async () => {
    await setPaymentDay("student-1", 15);

    expect(mockDoc).toHaveBeenCalledWith("mock-db", "users", "student-1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      paymentDueDay: 15,
    });
  });

  it("deletes paymentDueDay and monthlyPaymentPaid when day is null", async () => {
    await setPaymentDay("student-1", null);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      paymentDueDay: "DELETE_FIELD_SENTINEL",
      monthlyPaymentPaid: "DELETE_FIELD_SENTINEL",
    });
  });
});

describe("togglePayment", () => {
  it("unmarks payment when student has valid paymentValidUntil (future date)", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const student = makeStudent({
      paymentDueDay: 10,
      paymentValidUntil: {
        toDate: () => futureDate,
      } as any,
    });

    await togglePayment(student);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      monthlyPaymentPaid: false,
      paymentValidUntil: "DELETE_FIELD_SENTINEL",
    });
  });

  it("unmarks payment when monthlyPaymentPaid is true (no validUntil)", async () => {
    const student = makeStudent({
      paymentDueDay: 10,
      monthlyPaymentPaid: true,
    });

    await togglePayment(student);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      monthlyPaymentPaid: false,
      paymentValidUntil: "DELETE_FIELD_SENTINEL",
    });
  });

  it("marks payment as paid when currently unpaid (no validUntil)", async () => {
    const student = makeStudent({
      paymentDueDay: 15,
      monthlyPaymentPaid: false,
    });

    await togglePayment(student);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      monthlyPaymentPaid: true,
      paymentValidUntil: "TIMESTAMP_VALUE",
    });
    expect(mockTimestampFromDate).toHaveBeenCalled();
    // Verify the date passed to Timestamp.fromDate
    const passedDate = mockTimestampFromDate.mock.calls[0][0] as Date;
    expect(passedDate.getHours()).toBe(23);
    expect(passedDate.getMinutes()).toBe(59);
    expect(passedDate.getSeconds()).toBe(59);
  });

  it("marks payment when validUntil is in the past", async () => {
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const student = makeStudent({
      paymentDueDay: 10,
      paymentValidUntil: {
        toDate: () => pastDate,
      } as any,
    });

    await togglePayment(student);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      monthlyPaymentPaid: true,
      paymentValidUntil: "TIMESTAMP_VALUE",
    });
  });

  it("defaults dueDay to 10 when paymentDueDay is not set", async () => {
    const student = makeStudent({
      paymentDueDay: undefined,
      monthlyPaymentPaid: false,
    });

    await togglePayment(student);

    const passedDate = mockTimestampFromDate.mock.calls[0][0] as Date;
    expect(passedDate.getDate()).toBeLessThanOrEqual(31);
  });

  it("handles year wrap (December -> January)", async () => {
    // Mock Date to December
    const realDate = Date;
    const mockNow = new Date(2026, 11, 15); // December 15
    jest.spyOn(global, "Date").mockImplementation((...args: any[]) => {
      if (args.length === 0) return mockNow;
      return new (realDate as any)(...args);
    });

    const student = makeStudent({
      paymentDueDay: 10,
      monthlyPaymentPaid: false,
    });

    await togglePayment(student);

    const passedDate = mockTimestampFromDate.mock.calls[0][0] as Date;
    expect(passedDate.getFullYear()).toBe(2027);
    expect(passedDate.getMonth()).toBe(0); // January

    jest.restoreAllMocks();
  });
});

describe("toggleUserActive", () => {
  it("sets active to false when currently active", async () => {
    await toggleUserActive("student-1", true);

    expect(mockDoc).toHaveBeenCalledWith("mock-db", "users", "student-1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      active: false,
    });
  });

  it("sets active to true when currently inactive", async () => {
    await toggleUserActive("student-1", false);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      active: true,
    });
  });
});
