import { describe, it, expect } from "vitest";
import { safeUrl } from "./safeUrl";

describe("safeUrl", () => {
  it("passes through ordinary http(s) links", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("http://example.com/")).toBe("http://example.com/");
  });

  it("blocks script-bearing schemes", () => {
    // A stored attachment/embed URL is rendered straight into an anchor, so a
    // javascript: value would run in the viewer's session on click.
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("JavaScript:alert(1)")).toBeUndefined();
    expect(safeUrl("  javascript:alert(1)  ")).toBeUndefined();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeUrl("vbscript:msgbox(1)")).toBeUndefined();
  });

  it("allows mailto and tel", () => {
    expect(safeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeUrl("tel:+15551234")).toBe("tel:+15551234");
  });

  it("allows root-relative paths", () => {
    expect(safeUrl("/courses/1")).toBe("/courses/1");
  });

  it("returns undefined for empty or unparseable input", () => {
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
    expect(safeUrl("")).toBeUndefined();
    expect(safeUrl("   ")).toBeUndefined();
  });
});
