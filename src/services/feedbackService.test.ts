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
  limit: jest.fn((n: number) => ({ kind: "limit", n })),
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

  it("throws when create feedback API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Plano inativo" }),
    });

    await expect(
      createFeedback({ userId: "u1", userName: null, message: "oi" }),
    ).rejects.toThrow("Plano inativo");
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

  it("throws when delete feedback API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    });

    await expect(deleteFeedback("fb-1")).rejects.toThrow("Forbidden");
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
              data: () => ({
                userId: "u1",
                userName: null,
                message: "1",
                createdAt: makeTimestamp(1000),
              }),
            },
            {
              id: "b",
              data: () => ({
                userId: "u1",
                userName: "Ana",
                message: "2",
                createdAt: makeTimestamp(3000),
              }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenMyFeedbacks("u1", onData, onError);

    expect(mockWhere).toHaveBeenCalledWith("userId", "==", "u1");
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "b", message: "2", userName: "Ana" }),
      expect.objectContaining({ id: "a", message: "1", userName: null }),
    ]);
  });

  it("sorts feedbacks without createdAt as zero", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [
            { id: "a", data: () => ({ userId: "u1", message: "1" }) },
            {
              id: "b",
              data: () => ({
                userId: "u1",
                message: "2",
                createdAt: makeTimestamp(1000),
              }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenMyFeedbacks("u1", onData);

    expect(onData.mock.calls[0][0][0].id).toBe("b");
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

  it("returns empty list when public feedback API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    await expect(fetchPublicFeedbacks()).resolves.toEqual([]);
  });

  it("returns empty list when public feedback items is not an array", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: null }),
    });
    await expect(fetchPublicFeedbacks()).resolves.toEqual([]);
  });

  it("sorts feedbacks when createdAt.toDate returns value without getTime", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [
            {
              id: "a",
              data: () => ({
                userId: "u1",
                message: "1",
                createdAt: { toDate: () => ({}) },
              }),
            },
            {
              id: "b",
              data: () => ({
                userId: "u1",
                message: "2",
                createdAt: makeTimestamp(500),
              }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenMyFeedbacks("u1", onData);
    expect(onData.mock.calls[0][0][0].id).toBe("b");
  });

  it("sorts feedbacks when createdAt has no toDate helper", () => {
    const onData = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, onNext: (snap: unknown) => void) => {
        onNext({
          docs: [
            {
              id: "a",
              data: () => ({
                userId: "u1",
                message: "1",
                createdAt: { seconds: 1 },
              }),
            },
          ],
        });
        return () => undefined;
      },
    );

    listenMyFeedbacks("u1", onData);
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "a", message: "1" }),
    ]);
  });

  it("forwards snapshot errors from listenMyFeedbacks", () => {
    const onError = jest.fn();
    mockOnSnapshot.mockImplementationOnce(
      (_queryRef: unknown, _onNext: unknown, onErr: (error: Error) => void) => {
        onErr(new Error("denied"));
        return () => undefined;
      },
    );

    listenMyFeedbacks("u1", jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
