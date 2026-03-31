// Mock the Firebase modules BEFORE any imports
const mockInitializeApp = jest.fn().mockReturnValue("mock-app");
const mockGetApps = jest.fn().mockReturnValue([]);
const mockGetAuth = jest.fn().mockReturnValue("mock-auth");
const mockSetPersistence = jest.fn().mockResolvedValue(undefined);
const mockBrowserLocalPersistence = "BROWSER_LOCAL_PERSISTENCE";
const mockGetFirestore = jest.fn().mockReturnValue("mock-db");
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn().mockReturnValue("user-doc-ref");
const mockServerTimestamp = jest.fn().mockReturnValue("SERVER_TIMESTAMP");

jest.mock("firebase/app", () => ({
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  getApps: () => mockGetApps(),
}));

jest.mock("firebase/auth", () => ({
  getAuth: (...args: any[]) => mockGetAuth(...args),
  GoogleAuthProvider: jest.fn(),
  setPersistence: (...args: any[]) => mockSetPersistence(...args),
  browserLocalPersistence: mockBrowserLocalPersistence,
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: (...args: any[]) => mockGetFirestore(...args),
  serverTimestamp: () => mockServerTimestamp(),
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project-id";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456:web:abc";

// We need to do a fresh import for each test group to reset singletons
// So we use require + resetModules
let firebase: typeof import("./firebase");

beforeEach(() => {
  jest.clearAllMocks();
  // Reset module cache for singletons
  jest.resetModules();

  // Re-set env vars
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project-id";

  // Re-require the module
  firebase = require("./firebase");
});

describe("getFirebaseAuth", () => {
  it("initializes auth and sets persistence on first call", () => {
    const auth = firebase.getFirebaseAuth();

    expect(mockGetAuth).toHaveBeenCalled();
    expect(mockSetPersistence).toHaveBeenCalledWith(
      "mock-auth",
      mockBrowserLocalPersistence,
    );
    expect(auth).toBe("mock-auth");
  });

  it("returns cached auth on subsequent calls", () => {
    firebase.getFirebaseAuth();
    firebase.getFirebaseAuth();

    expect(mockGetAuth).toHaveBeenCalledTimes(1);
  });

  it("handles persistence error gracefully", () => {
    mockSetPersistence.mockRejectedValueOnce(new Error("persistence failed"));

    expect(() => firebase.getFirebaseAuth()).not.toThrow();

    // The error is caught in a .catch; wait a tick to ensure it doesn't surface.
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
});

describe("getFirestoreDb", () => {
  it("initializes firestore on first call", () => {
    const db = firebase.getFirestoreDb();

    expect(mockGetFirestore).toHaveBeenCalled();
    expect(db).toBe("mock-db");
  });

  it("returns cached db on subsequent calls", () => {
    firebase.getFirestoreDb();
    firebase.getFirestoreDb();

    expect(mockGetFirestore).toHaveBeenCalledTimes(1);
  });
});

describe("getFirebaseApp (via getFirebaseAuth)", () => {
  it("creates a new app when no apps exist", () => {
    mockGetApps.mockReturnValue([]);

    firebase.getFirebaseAuth();

    expect(mockInitializeApp).toHaveBeenCalled();
  });

  it("reuses existing app when one exists", () => {
    mockGetApps.mockReturnValue(["existing-app"]);

    firebase.getFirebaseAuth();

    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it("throws when config is missing", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "";
    jest.resetModules();
    const freshFirebase = require("./firebase");

    expect(() => freshFirebase.getFirebaseAuth()).toThrow(
      "Firebase config is missing",
    );
  });

  it("caches the app across getFirebaseAuth and getFirestoreDb calls", () => {
    firebase.getFirebaseAuth();
    firebase.getFirestoreDb();

    // getApps/initializeApp should only be called once total for both calls
    expect(mockGetAuth).toHaveBeenCalledTimes(1);
    expect(mockGetFirestore).toHaveBeenCalledTimes(1);
  });
});

describe("ensureUserDocument", () => {
  const mockUser = {
    uid: "user-123",
    displayName: "Test User",
    email: "test@test.com",
    photoURL: "https://photo.url/pic.jpg",
  } as any;

  it("creates a new document when user does not exist", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    const result = await firebase.ensureUserDocument(mockUser);

    expect(mockSetDoc).toHaveBeenCalledWith("user-doc-ref", {
      name: "Test User",
      email: "test@test.com",
      photoURL: "https://photo.url/pic.jpg",
      role: "student",
      planId: null,
      active: true,
      createdAt: "SERVER_TIMESTAMP",
    });
    expect(result.id).toBe("user-123");
    expect(result.name).toBe("Test User");
    expect(result.role).toBe("student");
    expect(result.createdAt).toBeNull();
  });

  it("returns existing document without updates when data matches", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "user-123",
      data: () => ({
        name: "Test User",
        email: "test@test.com",
        photoURL: "https://photo.url/pic.jpg",
        role: "coach",
        planId: "plan-1",
        active: true,
        createdAt: { toDate: () => new Date(2026, 0, 1) },
        paymentDueDay: 10,
        monthlyPaymentPaid: true,
        paymentValidUntil: "some-timestamp",
      }),
    });

    const result = await firebase.ensureUserDocument(mockUser);

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(result.role).toBe("coach");
    expect(result.planId).toBe("plan-1");
    expect(result.paymentDueDay).toBe(10);
    expect(result.monthlyPaymentPaid).toBe(true);
    expect(result.paymentValidUntil).toBe("some-timestamp");
  });

  it("syncs name, email, and photoURL when they differ", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "user-123",
      data: () => ({
        name: "Old Name",
        email: "old@test.com",
        photoURL: "https://old.url/pic.jpg",
        role: "student",
        active: true,
      }),
    });

    const result = await firebase.ensureUserDocument(mockUser);

    expect(mockUpdateDoc).toHaveBeenCalledWith("user-doc-ref", {
      name: "Test User",
      email: "test@test.com",
      photoURL: "https://photo.url/pic.jpg",
    });
    expect(result.name).toBe("Test User");
    expect(result.email).toBe("test@test.com");
    expect(result.photoURL).toBe("https://photo.url/pic.jpg");
  });

  it("handles updateDoc failure gracefully", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "user-123",
      data: () => ({
        name: "Old Name",
        email: "old@test.com",
        role: "student",
        active: true,
      }),
    });
    mockUpdateDoc.mockRejectedValueOnce(new Error("update failed"));

    const result = await firebase.ensureUserDocument(mockUser);

    // Should still return the correct profile even if update failed
    expect(result.name).toBe("Test User");
  });

  it("handles user with null fields", async () => {
    const minimalUser = {
      uid: "user-456",
      displayName: null,
      email: null,
      photoURL: null,
    } as any;

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "user-456",
      data: () => ({
        name: "Existing",
        email: "existing@test.com",
        role: "student",
        active: true,
      }),
    });

    const result = await firebase.ensureUserDocument(minimalUser);

    // Should not try to update since user fields are null
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(result.name).toBe("Existing");
    expect(result.email).toBe("existing@test.com");
  });

  it("returns defaults when document data has missing fields", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "user-789",
      data: () => ({}),
    });

    const minimalUser = {
      uid: "user-789",
      displayName: null,
      email: null,
      photoURL: null,
    } as any;

    const result = await firebase.ensureUserDocument(minimalUser);

    expect(result.role).toBe("student");
    expect(result.planId).toBeNull();
    expect(result.active).toBe(true);
    expect(result.createdAt).toBeNull();
    expect(result.paymentDueDay).toBeNull();
    expect(result.monthlyPaymentPaid).toBe(false);
    expect(result.paymentValidUntil).toBeNull();
  });
});

describe("googleProvider", () => {
  it("is exported", () => {
    expect(firebase.googleProvider).toBeDefined();
  });
});
