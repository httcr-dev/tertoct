export {};

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn((_db: unknown, col: string, id: string) => `${col}/${id}`);
const mockGetFirestoreDb = jest.fn(() => "mock-db");

jest.mock("firebase/firestore", () => ({
  doc: (a: unknown, b: string, c: string) => mockDoc(a, b, c),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(() => "SERVER_TS"),
}));

jest.mock("@/lib/firebase/client", () => ({
  getFirestoreDb: () => mockGetFirestoreDb(),
}));

import { ensureUserDocument } from "./userProfileService";

function makeUser(overrides: Partial<{
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}> = {}) {
  return {
    uid: "user-1",
    displayName: "Student",
    email: "student@test.local",
    photoURL: "https://example.com/p.jpg",
    ...overrides,
  } as import("firebase/auth").User;
}

describe("ensureUserDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it("creates a new student profile when missing", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const profile = await ensureUserDocument(makeUser());

    expect(mockSetDoc).toHaveBeenCalled();
    expect(profile).toMatchObject({
      id: "user-1",
      role: "student",
      active: true,
      name: "Student",
    });
  });

  it("returns existing profile without updates", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "user-1",
      data: () => ({
        name: "Student",
        email: "student@test.local",
        photoURL: "https://example.com/p.jpg",
        role: "student",
        active: true,
      }),
    });

    const profile = await ensureUserDocument(makeUser());

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(profile.role).toBe("student");
  });

  it("syncs changed Google fields on existing profile", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "user-1",
      data: () => ({
        name: "Old",
        email: "old@test.local",
        photoURL: "https://old.jpg",
        role: "student",
        active: true,
      }),
    });

    const profile = await ensureUserDocument(makeUser());

    expect(mockUpdateDoc).toHaveBeenCalledWith("users/user-1", {
      name: "Student",
      email: "student@test.local",
      photoURL: "https://example.com/p.jpg",
    });
    expect(profile.name).toBe("Student");
  });

  it("continues login when profile sync update fails", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "user-1",
      data: () => ({
        name: "Old",
        email: "old@test.local",
        role: "student",
        active: true,
      }),
    });
    mockUpdateDoc.mockRejectedValueOnce(new Error("permission denied"));

    const profile = await ensureUserDocument(
      makeUser({ photoURL: null }),
    );

    expect(profile.name).toBe("Student");
  });

  it("mirrors coach photo updates using stored name when name is unchanged", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "coach-1",
      data: () => ({
        name: "Coach Name",
        email: "coach@test.local",
        photoURL: "https://old.jpg",
        role: "coach",
        active: true,
      }),
    });

    await ensureUserDocument(
      makeUser({
        uid: "coach-1",
        displayName: "Coach Name",
        email: "coach@test.local",
        photoURL: "https://new.jpg",
      }),
    );

    expect(mockSetDoc).toHaveBeenCalledWith(
      "publicProfiles/coach-1",
      expect.objectContaining({
        name: "Coach Name",
        photoURL: "https://new.jpg",
      }),
      { merge: true },
    );
  });

  it("mirrors coach profile updates to publicProfiles", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "coach-1",
      data: () => ({
        name: "Old Coach",
        email: "coach@test.local",
        photoURL: "https://old.jpg",
        role: "coach",
        active: true,
        bio: "Bio",
      }),
    });

    await ensureUserDocument(
      makeUser({
        uid: "coach-1",
        displayName: "New Coach",
        email: "coach@test.local",
        photoURL: "https://new.jpg",
      }),
    );

    expect(mockSetDoc).toHaveBeenCalledWith(
      "publicProfiles/coach-1",
      expect.objectContaining({
        name: "New Coach",
        photoURL: "https://new.jpg",
        role: "coach",
      }),
      { merge: true },
    );
  });

  it("mirrors admin profile updates to publicProfiles", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "admin-1",
      data: () => ({
        name: "Admin",
        email: "admin@test.local",
        role: "admin",
        active: true,
      }),
    });

    await ensureUserDocument(
      makeUser({
        uid: "admin-1",
        displayName: "Admin Updated",
        email: "admin@test.local",
        photoURL: null,
      }),
    );

    expect(mockSetDoc).toHaveBeenCalledWith(
      "publicProfiles/admin-1",
      expect.objectContaining({ role: "admin", name: "Admin Updated" }),
      { merge: true },
    );
  });

  it("skips field updates when Google profile fields are empty", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "user-1",
      data: () => ({
        name: "Student",
        email: "student@test.local",
        role: "student",
        active: true,
      }),
    });

    await ensureUserDocument(
      makeUser({ displayName: null, email: null, photoURL: null }),
    );

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
