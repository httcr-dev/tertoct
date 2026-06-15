export {};

import { startOfWeek } from "@/lib/utils/date";
import { getDateKeyForOffset } from "@/lib/utils/dateKey";
import { createFirestoreMock, type FirestoreSeed } from "./__test__/firestoreMock";

const STUDENT_ID = "student-1";
const PLAN_ID = "plan-1";
const CLASS_ID = "class-1";
const UTC_OFFSET = -180;

const mockGetPrivateRouteContext = jest.fn();
const mockEnforcePrivateApiRateLimit = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock("@/lib/auth/privateRoute", () => ({
  getPrivateRouteContextFromRequest: () => mockGetPrivateRouteContext(),
  requireRole: () => null,
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

const mockApplyCheckinRollupIncrement = jest.fn();

jest.mock("@/lib/server/checkinCountRollup", () => ({
  applyCheckinRollupIncrement: (...args: unknown[]) =>
    mockApplyCheckinRollupIncrement(...args),
}));

function weekKeyFor(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function baseSeed(overrides: Partial<FirestoreSeed> = {}): FirestoreSeed {
  return {
    users: {
      [STUDENT_ID]: {
        name: "Aluno",
        role: "student",
        planId: PLAN_ID,
        active: true,
        monthlyPaymentPaid: true,
      },
    },
    plans: {
      [PLAN_ID]: {
        name: "Plano",
        classesPerWeek: 3,
        active: true,
      },
    },
    classes: {
      [CLASS_ID]: {
        name: "Turma",
        startTime: "20:00",
        checkinDeadlineTime: "19:00",
        capacity: 2,
        utcOffsetMinutes: UTC_OFFSET,
        active: true,
      },
    },
    checkinCounters: {},
    classCheckinCounters: {},
    checkins: {},
    ...overrides,
  };
}

function authOk() {
  mockGetPrivateRouteContext.mockResolvedValue({
    ok: true,
    context: { session: { uid: STUDENT_ID }, role: "student" },
  });
}

function postBody(overrides: Record<string, string> = {}) {
  return {
    planId: PLAN_ID,
    classId: CLASS_ID,
    ...overrides,
  };
}

async function postCheckin(
  body: Record<string, string> = postBody(),
): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/private/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/private/checkins", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    authOk();
    mockEnforcePrivateApiRateLimit.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates check-in when all rules pass", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T20:00:00.000Z")); // 17:00 SP, antes do prazo 19:00

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const todayKey = getDateKeyForOffset(new Date(), UTC_OFFSET);
    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(mock.getDoc("checkins", `${STUDENT_ID}_${CLASS_ID}_${todayKey}`)).toBeDefined();
    expect(mock.getDoc("checkinCounters", `${STUDENT_ID}_${weekKeyFor(new Date())}`)?.count).toBe(
      1,
    );
    expect(mockApplyCheckinRollupIncrement).toHaveBeenCalled();
  });

  it("allows advance check-in for a future weekday in the same week", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T20:00:00.000Z")); // quarta

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin(
      postBody({ classDateKey: "2026-06-05" }), // sexta
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(mock.getDoc("checkins", `${STUDENT_ID}_${CLASS_ID}_2026-06-05`)).toBeDefined();
  });

  it("rejects check-in for a date outside the allowed work-week window", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T20:00:00.000Z")); // quarta

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin(
      postBody({ classDateKey: "2026-06-08" }), // segunda seguinte
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/não disponível/i);
  });

  it("rejects check-in when student account is inactive", async () => {
    const mock = createFirestoreMock(
      baseSeed({
        users: {
          [STUDENT_ID]: {
            planId: PLAN_ID,
            active: false,
            monthlyPaymentPaid: true,
          },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/desativada/i);
  });

  it("rejects check-in when plan does not match user", async () => {
    const mock = createFirestoreMock(
      baseSeed({
        users: {
          [STUDENT_ID]: {
            planId: "other-plan",
            active: true,
            monthlyPaymentPaid: true,
          },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/plano não está válido/i);
  });

  it("rejects check-in when plan is inactive", async () => {
    const mock = createFirestoreMock(
      baseSeed({
        plans: { [PLAN_ID]: { classesPerWeek: 3, active: false } },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/plano não está válido/i);
  });

  it("rejects check-in when payment is overdue", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

    const mock = createFirestoreMock(
      baseSeed({
        users: {
          [STUDENT_ID]: {
            planId: PLAN_ID,
            active: true,
            monthlyPaymentPaid: false,
            paymentDueDay: 5,
          },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Mensalidade pendente/i);
  });

  it("rejects check-in when class is inactive", async () => {
    const mock = createFirestoreMock(
      baseSeed({
        classes: {
          [CLASS_ID]: {
            startTime: "20:00",
            checkinDeadlineTime: "19:00",
            capacity: 10,
            utcOffsetMinutes: UTC_OFFSET,
            active: false,
          },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/turma está desativada/i);
  });

  it("rejects check-in after deadline on the same day", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T23:30:00.000Z")); // 20:30 SP, após 19:00

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Check-in encerrado/i);
  });

  it("rejects check-in for past dates", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin(postBody({ classDateKey: "2026-06-03" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/datas passadas/i);
  });

  it("rejects duplicate check-in for same class and date", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T20:00:00.000Z"));
    const todayKey = getDateKeyForOffset(new Date(), UTC_OFFSET);

    const mock = createFirestoreMock(
      baseSeed({
        checkins: {
          [`${STUDENT_ID}_${CLASS_ID}_${todayKey}`]: {
            userId: STUDENT_ID,
            classId: CLASS_ID,
            classDateKey: todayKey,
          },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/já fez check-in/i);
  });

  it("rejects check-in when class is full", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T20:00:00.000Z"));
    const todayKey = getDateKeyForOffset(new Date(), UTC_OFFSET);

    const mock = createFirestoreMock(
      baseSeed({
        classCheckinCounters: {
          [`${CLASS_ID}_${todayKey}`]: { count: 2 },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Turma lotada/i);
  });

  it("rejects check-in when weekly limit is reached", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-03T20:00:00.000Z"));
    const weekKey = weekKeyFor(new Date());

    const mock = createFirestoreMock(
      baseSeed({
        checkinCounters: {
          [`${STUDENT_ID}_${weekKey}`]: { userId: STUDENT_ID, weekKey, count: 3 },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/limite de check-ins desta semana/i);
  });

  it("rejects invalid user, plan or class", async () => {
    const mock = createFirestoreMock({ users: {}, plans: {}, classes: {} });
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin();
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/inválidos/i);
  });

  it("rejects invalid classDateKey format", async () => {
    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await postCheckin(postBody({ classDateKey: "03-06-2026" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Formato de data inválido/i);
  });
});
