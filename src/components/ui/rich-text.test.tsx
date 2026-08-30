import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RichText } from "./rich-text";
import { RichTextEditor } from "./rich-text-editor";

const SAMPLE = `Close **more deals** in 30 days, without *cold calling*.

You get:
- Weekly **live** coaching calls
- A [scripts library](https://example.com/scripts)
- <script>alert(1)</script> stays text

1. Audit your pipeline
2. Fix the leak
3. Scale

Ready when you are.`;

/** The editor is controlled, so a host with state is what exercises it. */
function Host({ initial = SAMPLE }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <RichTextEditor value={value} onChange={setValue} rows={10} />;
}

describe("RichText", () => {
  it("renders each construct as its own element", () => {
    const { container } = render(<RichText value={SAMPLE} />);

    expect(container.querySelectorAll("strong").length).toBe(2);
    expect(container.querySelectorAll("em").length).toBe(1);
    expect(container.querySelectorAll("ul li").length).toBe(3);
    expect(container.querySelectorAll("ol li").length).toBe(3);
    // Intro, the "You get:" lead-in, and the closing line.
    expect(container.querySelectorAll("p").length).toBe(3);
  });

  // The reason the format exists at all: authored text can never become markup.
  it("shows an author's HTML as characters, not as nodes", () => {
    const { container } = render(<RichText value={SAMPLE} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("links out safely", () => {
    const { container } = render(<RichText value={SAMPLE} />);
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("https://example.com/scripts");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("drops a javascript: target but keeps its words", () => {
    const { container } = render(<RichText value="[tap me](javascript:alert(1))" />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("tap me");
  });

  it("shows the fallback when there is nothing to render", () => {
    render(<RichText value="   " fallback={<span>Nothing yet.</span>} />);
    expect(screen.getByText("Nothing yet.")).toBeTruthy();
  });
});

describe("RichTextEditor", () => {
  it("formats the selection from the toolbar", () => {
    render(<Host initial="Close more deals" />);
    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    box.setSelectionRange(0, 5);
    fireEvent.click(screen.getByLabelText("Bold"));
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "**Close** more deals",
    );
  });

  it("formats on Ctrl+B as well as from the toolbar", () => {
    render(<Host initial="Close more deals" />);
    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    box.setSelectionRange(0, 5);
    fireEvent.keyDown(box, { key: "b", ctrlKey: true });
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "**Close** more deals",
    );
  });

  it("makes a list out of the lines the selection touches", () => {
    render(<Host initial={"one\ntwo"} />);
    const box = document.querySelector("textarea") as HTMLTextAreaElement;
    box.setSelectionRange(0, 7);
    fireEvent.click(screen.getByLabelText("Bulleted list"));
    expect((document.querySelector("textarea") as HTMLTextAreaElement).value).toBe("- one\n- two");
  });

  it("swaps the box for a rendered preview and back", () => {
    render(<Host initial="a **bold** claim" />);
    fireEvent.click(screen.getByText("Preview"));
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.querySelector("strong")?.textContent).toBe("bold");

    fireEvent.click(screen.getByText("Write"));
    expect(document.querySelector("textarea")).not.toBeNull();
  });
});
