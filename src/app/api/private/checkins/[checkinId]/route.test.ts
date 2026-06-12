export {};

import { createFirestoreMock, type FirestoreSeed } from "../__test__/firestoreMock";

const STUDENT_ID = "student-1";
const CLASS_ID = "class-1";
const CHECKIN_ID = `${STUDENT_ID}_${CLASS_ID}_2026-06-10`;
const WEEK_KEY = "2026-06-08";

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

jest.mock("@/lib/server/checkinCountRollup", () => ({
  applyCheckinRollupDecrement: jest.fn(),
  isWithinRollupWindow: jest.fn(() => true),
}));

function baseSeed(overrides: Partial<FirestoreSeed> = {}): FirestoreSeed {
  return {
    checkins: {
      [CHECKIN_ID]: {
        userId: STUDENT_ID,
        planId: "plan-1",
        classId: CLASS_ID,
        classDateKey: "2026-06-10",
        weekKey: WEEK_KEY,
        classStartTime: "20:00",
        className: "Turma",
      },
    },
    classes: {
      [CLASS_ID]: {
        startTime: "20:00",
        utcOffsetMinutes: -180,
        active: true,
      },
    },
    checkinCounters: {
      [`${STUDENT_ID}_${WEEK_KEY}`]: { userId: STUDENT_ID, weekKey: WEEK_KEY, count: 1 },
    },
    classCheckinCounters: {
      [`${CLASS_ID}_2026-06-10`]: { classId: CLASS_ID, classDateKey: "2026-06-10", count: 1 },
    },
    ...overrides,
  };
}

function authOk() {
  mockGetPrivateRouteContext.mockResolvedValue({
    ok: true,
    context: { session: { uid: STUDENT_ID }, role: "student" },
  });
}

async function deleteCheckin(checkinId: string): Promise<Response> {
  const { DELETE } = await import("./route");
  return DELETE(
    new Request(`http://localhost/api/private/checkins/${checkinId}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ checkinId }) },
  );
}

describe("DELETE /api/private/checkins/[checkinId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    authOk();
    mockEnforcePrivateApiRateLimit.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("cancels check-in and decrements counters when allowed", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-09T12:00:00.000Z")); // >1h antes de 20:00 do dia 10

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await deleteCheckin(CHECKIN_ID);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(mock.getDoc("checkins", CHECKIN_ID)).toBeUndefined();
    expect(mock.getDoc("checkinCounters", `${STUDENT_ID}_${WEEK_KEY}`)?.count).toBe(0);
    expect(mock.getDoc("classCheckinCounters", `${CLASS_ID}_2026-06-10`)?.count).toBe(0);
  });

  it("returns 404 when check-in does not exist", async () => {
    const mock = createFirestoreMock({ checkins: {} });
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await deleteCheckin("missing-id");
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toMatch(/não encontrado/i);
  });

  it("rejects cancel when check-in belongs to another user", async () => {
    const mock = createFirestoreMock(
      baseSeed({
        checkins: {
          [CHECKIN_ID]: {
            userId: "other-user",
            classId: CLASS_ID,
            classDateKey: "2026-06-10",
            weekKey: WEEK_KEY,
            classStartTime: "20:00",
          },
        },
      }),
    );
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await deleteCheckin(CHECKIN_ID);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/não pode cancelar/i);
  });

  it("rejects cancel within 1 hour of class start", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-10T23:30:00.000Z")); // 20:30 SP no dia da aula

    const mock = createFirestoreMock(baseSeed());
    mockGetAdminFirestore.mockReturnValue(mock.db);

    const response = await deleteCheckin(CHECKIN_ID);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/1 hora antes/i);
  });
});
