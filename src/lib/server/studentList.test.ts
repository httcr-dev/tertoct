export {};

const mockGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        startAfter: jest.fn().mockReturnThis(),
        get: mockGet,
      }),
    }),
  }),
}));

import { listStudentsPage } from "./studentList";
import type { StudentSummary } from "@/lib/types";
import { filterStudents } from "@/lib/utils/studentFilter";
import {
  getEffectiveDueDate,
  getStudentPaymentInfo,
  isMarkedPaid,
} from "@/lib/utils/studentPayment";

describe("listStudentsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps students and returns nextCursor when page is full", async () => {
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "s1",
          data: () => ({
            name: "Ana",
            email: "ana@test.local",
            role: "student",
            active: true,
          }),
        },
        {
          id: "s2",
          data: () => ({
            name: "Bruno",
            role: "student",
          }),
        },
      ],
    });

    const page = await listStudentsPage({ limit: 2 });
    expect(page.students).toHaveLength(2);
    expect(page.students[0]).toEqual(
      expect.objectContaining({ id: "s1", name: "Ana", active: true }),
    );
    expect(page.nextCursor).toBeTruthy();
  });

  it("serializes paymentValidUntil as ISO string", async () => {
    const validUntil = new Date(2025, 6, 15, 23, 59, 59, 999);
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "s1",
          data: () => ({
            name: "Ana",
            paymentValidUntil: {
              toDate: () => validUntil,
              seconds: Math.floor(validUntil.getTime() / 1000),
            },
          }),
        },
      ],
    });

    const page = await listStudentsPage({ limit: 10 });
    expect(page.students[0].paymentValidUntil).toBe(validUntil.toISOString());
  });

  it("client payment UI handles JSON round-trip from students API", async () => {
    const validUntil = new Date(2025, 6, 15, 23, 59, 59, 999);
    const now = new Date(2025, 5, 10, 12, 0, 0);
    mockGet.mockResolvedValue({
      docs: [
        {
          id: "s1",
          data: () => ({
            name: "Ana",
            paymentDueDay: 10,
            paymentValidUntil: {
              toDate: () => validUntil,
              _seconds: Math.floor(validUntil.getTime() / 1000),
              _nanoseconds: 0,
            },
          }),
        },
      ],
    });

    const page = await listStudentsPage({ limit: 10 });
    const payload = JSON.parse(JSON.stringify(page)) as {
      students: StudentSummary[];
    };
    const student = payload.students[0];

    expect(student.paymentValidUntil).toBe(validUntil.toISOString());
    expect(() => isMarkedPaid(student, now)).not.toThrow();
    expect(() => getStudentPaymentInfo(student, now)).not.toThrow();
    expect(() => getEffectiveDueDate(student, now)).not.toThrow();
    expect(() =>
      filterStudents([student], {
        selectedPlanId: "all",
        paymentFilter: "paid",
      }),
    ).not.toThrow();
    expect(isMarkedPaid(student, now)).toBe(true);
  });

  it("returns null nextCursor for partial page", async () => {
    mockGet.mockResolvedValue({
      docs: [{ id: "s1", data: () => ({ name: "Ana" }) }],
    });

    const page = await listStudentsPage({ limit: 10 });
    expect(page.nextCursor).toBeNull();
  });
});
