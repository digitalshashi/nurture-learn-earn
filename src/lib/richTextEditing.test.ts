import { describe, it, expect } from "vitest";
import { insertLink, toggleLinePrefix, toggleWrap } from "./richTextEditing";

/**
 * The toolbar is judged on two things: the text it leaves behind, and where
 * the selection ends up. Getting the second one wrong is what makes an editor
 * feel broken — the caret jumps and the next keystroke lands somewhere else —
 * so both are asserted here, written as the visible selection.
 */
function show(edit: { text: string; selectionStart: number; selectionEnd: number }): string {
  return (
    edit.text.slice(0, edit.selectionStart) +
    "|" +
    edit.text.slice(edit.selectionStart, edit.selectionEnd) +
    "|" +
    edit.text.slice(edit.selectionEnd)
  );
}

describe("bold and italic", () => {
  it("wraps the selection and keeps it selected", () => {
    expect(show(toggleWrap("make this bold", 5, 9, "**"))).toBe("make **|this|** bold");
    expect(show(toggleWrap("make this bold", 5, 9, "*"))).toBe("make *|this|* bold");
  });

  it("unwraps when the selection is already inside the markers", () => {
    // "make **this** bold", with just "this" selected.
    expect(show(toggleWrap("make **this** bold", 7, 11, "**"))).toBe("make |this| bold");
  });

  it("unwraps when the markers themselves are selected", () => {
    expect(show(toggleWrap("make **this** bold", 5, 13, "**"))).toBe("make |this| bold");
  });

  it("opens an empty pair and puts the caret inside it", () => {
    expect(show(toggleWrap("type here", 5, 5, "**"))).toBe("type **||**here");
  });

  // Bold is "**" and italic is "*". Pressing Italic on a bold word has to add
  // a level, not quietly demote the bold to italic.
  it("nests italic inside bold rather than replacing it", () => {
    expect(show(toggleWrap("a **b** c", 4, 5, "*"))).toBe("a ***|b|*** c");
  });

  it("takes italic back off a word that is both", () => {
    expect(show(toggleWrap("a ***b*** c", 5, 6, "*"))).toBe("a **|b|** c");
  });

  it("takes bold off a word that is both, leaving the italic", () => {
    expect(show(toggleWrap("a ***b*** c", 5, 6, "**"))).toBe("a *|b|* c");
  });
});

describe("lists", () => {
  it("marks every line the selection touches", () => {
    expect(toggleLinePrefix("one\ntwo\nthree", 0, 9, false).text).toBe("- one\n- two\n- three");
  });

  it("numbers from one, whatever the lines said before", () => {
    expect(toggleLinePrefix("one\ntwo", 0, 7, true).text).toBe("1. one\n2. two");
  });

  it("takes the markers off when every line already has one", () => {
    expect(toggleLinePrefix("- one\n- two", 0, 11, false).text).toBe("one\ntwo");
    expect(toggleLinePrefix("1. one\n2. two", 0, 13, true).text).toBe("one\ntwo");
  });

  // Half-marked selections should finish the job, not undo it.
  it("marks the rest when only some lines have a marker", () => {
    expect(toggleLinePrefix("- one\ntwo", 0, 9, false).text).toBe("- one\n- two");
  });

  it("works from a caret in the middle of a single line", () => {
    expect(toggleLinePrefix("one\ntwo\nthree", 5, 5, false).text).toBe("one\n- two\nthree");
  });

  it("leaves blank lines alone", () => {
    expect(toggleLinePrefix("one\n\ntwo", 0, 8, false).text).toBe("- one\n\n- two");
  });
});

describe("links", () => {
  it("keeps the selected words as the label and selects the URL to type over", () => {
    expect(show(insertLink("read the guide now", 5, 14))).toBe("read [the guide](|https://|) now");
  });

  it("with nothing selected, offers a label to type over", () => {
    expect(show(insertLink("read ", 5, 5))).toBe("read [|link text|](https://)");
  });
});
