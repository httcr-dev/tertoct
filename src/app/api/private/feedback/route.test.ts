export {};

import { createFeedbackFirestoreMock } from "./__test__/firestoreMock";

const STUDENT_ID = "student-1";
const PLAN_ID = "plan-1";

const mockWithPrivateMutation = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock("@/lib/auth/withPrivateMutation", () => ({
  withPrivateMutation: (
    req: Request,
    options: { roles: string[] },
    handler: (ctx: {
      req: Request;
      auth: { session: { uid: string }; role: string | null };
    }) => Promise<Response>,
  ) => mockWithPrivateMutation(req, options, handler),
}));

jest.mock("@/lib/auth/admin", () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

function wireMutationAsStudent() {
  mockWithPrivateMutation.mockImplementation(
    async (
      req: Request,
      _options: { roles: string[] },
      handler: (ctx: {
        req: Request;
        auth: { session: { uid: string }; role: string | null };
      }) => Promise<Response>,
    ) =>
      handler({
        req,
        auth: { session: { uid: STUDENT_ID }, role: "student" },
      }),
  );
}

function baseSeed(overrides: Partial<Parameters<typeof createFeedbackFirestoreMock>[0]> = {}) {
  return createFeedbackFirestoreMock({
    users: {
      [STUDENT_ID]: {
        role: "student",
        active: true,
        planId: PLAN_ID,
      },
    },
    plans: {
      [PLAN_ID]: {
        active: true,
        name: "Plano",
        classesPerWeek: 3,
      },
    },
    ...overrides,
  });
}

async function postFeedback(body: Record<string, unknown>): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/private/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/private/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wireMutationAsStudent();
  });

  it("creates feedback when student is active with active plan", async () => {
    const mock = baseSeed();
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await postFeedback({ message: "  Ótimo treino  ", userName: "Aluno" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(Object.keys(mock.store.feedbacks)).toHaveLength(1);
    const saved = Object.values(mock.store.feedbacks)[0];
    expect(saved).toMatchObject({
      userId: STUDENT_ID,
      userName: "Aluno",
      message: "Ótimo treino",
    });
  });

  it("rejects empty message", async () => {
    const mock = baseSeed();
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await postFeedback({ message: "   " });

    expect(res.status).toBe(400);
    expect(Object.keys(mock.store.feedbacks)).toHaveLength(0);
  });

  it("rejects when student account is inactive", async () => {
    const mock = baseSeed({
      users: {
        [STUDENT_ID]: {
          role: "student",
          active: false,
          planId: PLAN_ID,
        },
      },
    });
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await postFeedback({ message: "Teste" });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/desativada/i),
    });
  });

  it("rejects when student has no active plan", async () => {
    const mock = baseSeed({
      users: {
        [STUDENT_ID]: {
          role: "student",
          active: true,
          planId: null,
        },
      },
    });
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await postFeedback({ message: "Teste" });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/plano/i),
    });
  });

  it("rejects when plan document is inactive", async () => {
    const mock = baseSeed({
      plans: {
        [PLAN_ID]: {
          active: false,
          name: "Plano",
          classesPerWeek: 3,
        },
      },
    });
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await postFeedback({ message: "Teste" });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/plano/i),
    });
  });

  it("rejects message longer than 64 characters", async () => {
    const mock = baseSeed();
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const res = await postFeedback({ message: "x".repeat(65) });

    expect(res.status).toBe(400);
    expect(Object.keys(mock.store.feedbacks)).toHaveLength(0);
  });
});
