import { formatHHmm, parseHHmm } from "./time";

describe("parseHHmm", () => {
  it("parses valid times", () => {
    expect(parseHHmm("07:30")).toBe(7 * 60 + 30);
    expect(parseHHmm("00:00")).toBe(0);
    expect(parseHHmm("23:59")).toBe(23 * 60 + 59);
  });

  it("trims whitespace", () => {
    expect(parseHHmm("  08:15  ")).toBe(8 * 60 + 15);
  });

  it("returns null for invalid input", () => {
    expect(parseHHmm("")).toBeNull();
    expect(parseHHmm("7:30")).toBeNull();
    expect(parseHHmm("25:00")).toBeNull();
    expect(parseHHmm("12:60")).toBeNull();
    expect(parseHHmm("ab:cd")).toBeNull();
  });
});

describe("formatHHmm", () => {
  it("formats minutes as HH:mm", () => {
    expect(formatHHmm(7 * 60 + 5)).toBe("07:05");
    expect(formatHHmm(0)).toBe("00:00");
    expect(formatHHmm(23 * 60 + 59)).toBe("23:59");
  });

  it("wraps negative and overflow values modulo 24h", () => {
    expect(formatHHmm(-1)).toBe("23:59");
    expect(formatHHmm(24 * 60)).toBe("00:00");
    expect(formatHHmm(25 * 60 + 30)).toBe("01:30");
  });
});
