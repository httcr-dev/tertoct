export {};

const mockCollection = jest.fn(() => "feedback-col-ref");
const mockGetFirestoreDb = jest.fn(() => "mock-db");
const mockOnSnapshot = jest.fn();
const mockQuery = jest.fn((...args: unknown[]) => ({ args }));
const mockWhere = jest.fn(() => "where-user-id");

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: mockCollection,
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  onSnapshot: mockOnSnapshot,
  query: mockQuery,
  serverTimestamp: jest.fn(),
  where: mockWhere,
}));

jest.mock("@/lib/firebase", () => ({
  getFirestoreDb: () => mockGetFirestoreDb(),
}));

import {
  createFeedback,
  deleteFeedback,
  fetchPublicFeedbacks,
  listenMyFeedbacks,
} from "./feedbackService";

function makeTimestamp(ms: number) {
  return {
    toDate: () => new Date(ms),
  };
}

describe("feedbackService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot.mockReturnValue(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as unknown as typeof fetch;
  });

  it("creates feedback through private API", async () => {
    await createFeedback({
      userId: "u1",
      userName: "User 1",
      message: "  oi  ",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/private/feedback",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("ignores empty message after trim", async () => {
    await createFeedback({
      userId: "u1",
      userName: null,
      message: "   ",
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deletes feedback through private API", async () => {
    await deleteFeedback("fb-1");
    expect(global.fetch).toHaveBeenCalledWith("/api/private/feedback/fb-1", {
      method: "DELETE",
    });
  });

  it("listens own feedbacks sorted by createdAt desc", () => {
    const onData = jest.fn();
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [
            {
              id: "a",
              data: () => ({ userId: "u1", message: "1", createdAt: makeTimestamp(1000) }),
            },
            {
              id: "b",
              data: () => ({ userId: "u1", message: "2", createdAt: makeTimestamp(3000) }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenMyFeedbacks("u1", onData, onError);

    expect(mockWhere).toHaveBeenCalledWith("userId", "==", "u1");
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "b", message: "2" }),
      expect.objectContaining({ id: "a", message: "1" }),
    ]);
  });

  it("fetches public feedbacks from API", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [{ id: "1", userName: "A", message: "hi", createdAtMs: 1 }],
      }),
    });

    const items = await fetchPublicFeedbacks();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/public/feedbacks",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(items).toEqual([
      { id: "1", userName: "A", message: "hi", createdAtMs: 1 },
    ]);
  });
});
