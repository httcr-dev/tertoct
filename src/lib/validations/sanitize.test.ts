jest.mock("isomorphic-dompurify", () => ({
  __esModule: true,
  default: {
    sanitize: (input: string, opts?: { ALLOWED_TAGS?: string[] }) => {
      const withoutScripts = input.replace(
        /<script[\s\S]*?<\/script>/gi,
        "",
      );
      if (!opts?.ALLOWED_TAGS?.length) {
        return withoutScripts.replace(/<[^>]+>/g, "");
      }
      return withoutScripts;
    },
  },
}));

import { sanitizeHtml, stripHtml } from "./sanitize";

describe("sanitize", () => {
  it("stripHtml removes all tags", () => {
    expect(stripHtml("<script>alert(1)</script>Hello")).toBe("Hello");
    expect(stripHtml("<b>bold</b>")).toBe("bold");
  });

  it("sanitizeHtml keeps allowed formatting tags", () => {
    const html = '<p>Hi <strong>there</strong></p><script>x</script>';
    const result = sanitizeHtml(html);
    expect(result).toContain("<strong>");
    expect(result).not.toContain("<script>");
  });

  it("returns empty string for non-string input", () => {
    expect(stripHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
  });
});
