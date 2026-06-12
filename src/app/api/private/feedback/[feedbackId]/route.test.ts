export {};

import { createFeedbackFirestoreMock } from "../__test__/firestoreMock";

const STUDENT_ID = "student-1";
const OTHER_STUDENT_ID = "student-2";
const COACH_ID = "coach-1";
const FEEDBACK_ID = "fb_1";

const mockGetPrivateRouteContext = jest.fn();
const mockEnforcePrivateApiRateLimit = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock("@/lib/auth/privateRoute", () => ({
  getPrivateRouteContextFromRequest: () => mockGetPrivateRouteContext(),
}));

jest.mock("@/lib/auth/privateApiRateLimit", () => ({
  enforcePrivateApiRateLimit: () => mockEnforcePrivateApiRateLimit(),
}));

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

jest.mock("@/lib/security/origin", () => ({
  isTrustedMutationRequest: () => true,
}));

function authAs(uid: string, role: string | null) {
  mockGetPrivateRouteContext.mockResolvedValue({
    ok: true,
    context: { session: { uid }, role },
  });
}

function seedFeedback(userId = STUDENT_ID) {
  return createFeedbackFirestoreMock({
    feedbacks: {
      [FEEDBACK_ID]: {
        userId,
        message: "Feedback teste",
        userName: "Aluno",
      },
    },
  });
}

async function deleteFeedback(feedbackId = FEEDBACK_ID): Promise<Response> {
  const { DELETE } = await import("./route");
  return DELETE(
    new Request(`http://localhost/api/private/feedback/${feedbackId}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ feedbackId }) },
  );
}

describe("DELETE /api/private/feedback/[feedbackId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnforcePrivateApiRateLimit.mockResolvedValue(null);
  });

  it("allows student to delete own feedback", async () => {
    authAs(STUDENT_ID, "student");
    const mock = seedFeedback(STUDENT_ID);
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await deleteFeedback();

    expect(res.status).toBe(200);
    expect(mock.store.feedbacks[FEEDBACK_ID]).toBeUndefined();
  });

  it("allows coach to delete student feedback", async () => {
    authAs(COACH_ID, "coach");
    const mock = seedFeedback(STUDENT_ID);
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await deleteFeedback();

    expect(res.status).toBe(200);
    expect(mock.store.feedbacks[FEEDBACK_ID]).toBeUndefined();
  });

  it("denies student deleting another student's feedback", async () => {
    authAs(STUDENT_ID, "student");
    const mock = seedFeedback(OTHER_STUDENT_ID);
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await deleteFeedback();

    expect(res.status).toBe(403);
    expect(mock.store.feedbacks[FEEDBACK_ID]).toBeDefined();
  });

  it("returns 404 when feedback does not exist", async () => {
    authAs(STUDENT_ID, "student");
    const mock = createFeedbackFirestoreMock();
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await deleteFeedback("missing");

    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetPrivateRouteContext.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });
    mockGetAdminFirestore.mockReturnValue(createFeedbackFirestoreMock().db);

    const res = await deleteFeedback();

    expect(res.status).toBe(401);
  });
});
