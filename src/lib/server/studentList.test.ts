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

  it("returns null nextCursor for partial page", async () => {
    mockGet.mockResolvedValue({
      docs: [{ id: "s1", data: () => ({ name: "Ana" }) }],
    });

    const page = await listStudentsPage({ limit: 10 });
    expect(page.nextCursor).toBeNull();
  });
});
