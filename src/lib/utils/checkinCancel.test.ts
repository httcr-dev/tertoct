import {
  canCancelCheckIn,
  formatClassDateKey,
  getCheckInCancelDeadline,
} from "./checkinCancel";
import type { CheckIn } from "@/lib/types";

const baseCheckIn: CheckIn = {
  id: "u1_c1_2026-05-19",
  userId: "u1",
  planId: "p1",
  classId: "c1",
  classDateKey: "2026-05-19",
  className: "Turma 07:00",
  classStartTime: "07:00",
  createdAt: new Date("2026-05-16T10:00:00Z"),
};

const gymClass = {
  startTime: "07:00",
  utcOffsetMinutes: -180,
};

describe("checkinCancel", () => {
  it("allows cancel more than 1h before class start", () => {
    const deadline = getCheckInCancelDeadline(baseCheckIn, gymClass);
    expect(deadline).not.toBeNull();
    expect(canCancelCheckIn(baseCheckIn, gymClass, new Date(deadline!.getTime() - 1))).toBe(
      true,
    );
  });

  it("denies cancel within 1h of class start", () => {
    const deadline = getCheckInCancelDeadline(baseCheckIn, gymClass);
    expect(deadline).not.toBeNull();
    expect(canCancelCheckIn(baseCheckIn, gymClass, new Date(deadline!.getTime() + 1))).toBe(
      false,
    );
  });

  it("formats class date key in pt-BR", () => {
    expect(formatClassDateKey("2026-05-19")).toMatch(/19\/05\/2026/);
  });

  it("returns raw date key when format is invalid", () => {
    expect(formatClassDateKey("invalid")).toBe("invalid");
  });

  it("derives class date key from createdAt when classDateKey is missing", () => {
    const checkIn = { ...baseCheckIn, classDateKey: undefined as unknown as string };
    expect(getCheckInCancelDeadline(checkIn, gymClass)).not.toBeNull();
  });

  it("returns null deadline when class timing is invalid", () => {
    expect(
      getCheckInCancelDeadline(
        { ...baseCheckIn, classStartTime: "invalid" },
        gymClass,
      ),
    ).toBeNull();
    expect(
      getCheckInCancelDeadline(
        { ...baseCheckIn, classDateKey: "bad-date", classStartTime: undefined as unknown as string },
        null,
      ),
    ).toBeNull();
  });
});
