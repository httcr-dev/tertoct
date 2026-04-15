export {};

const mockCollection = jest.fn(() => "feedback-col-ref");
const mockGetFirestoreDb = jest.fn(() => "mock-db");
const mockLimit = jest.fn((n: number) => `limit-${n}`);
const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn(() => "order-by-createdAt-desc");
const mockQuery = jest.fn((...args: unknown[]) => ({ args }));
const mockWhere = jest.fn(() => "where-user-id");

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: mockCollection,
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  limit: mockLimit,
  onSnapshot: mockOnSnapshot,
  orderBy: mockOrderBy,
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
  listenMyFeedbacks,
  listenPublicFeedbacks,
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

  it("listens public feedbacks with query limit", () => {
    const onData = jest.fn();
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [{ id: "pub1", data: () => ({ userId: "u2", message: "hello" }) }],
        });
        return () => undefined;
      },
    );

    listenPublicFeedbacks(onData, onError);

    expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mockLimit).toHaveBeenCalledWith(30);
    expect(onData).toHaveBeenCalledWith([expect.objectContaining({ id: "pub1" })]);
  });
});
