export {};

const mockSetCustomUserClaims = jest.fn();
const mockGet = jest.fn();

jest.mock("@/lib/auth/admin", () => ({
  getAdminAuth: () => ({
    setCustomUserClaims: mockSetCustomUserClaims,
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: mockGet,
      }),
    }),
  }),
}));

import { syncCustomClaimsFromFirestore } from "./customClaims";

describe("syncCustomClaimsFromFirestore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets claims from Firestore role", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ role: "coach" }),
    });

    const role = await syncCustomClaimsFromFirestore("uid-1");

    expect(role).toBe("coach");
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid-1", {
      role: "coach",
      admin: false,
      coach: true,
      student: false,
    });
  });

  it("returns null when user is missing", async () => {
    mockGet.mockResolvedValue({ exists: false });

    const role = await syncCustomClaimsFromFirestore("missing");

    expect(role).toBeNull();
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
