/**
 * A formatting editor for descriptions.
 *
 * It edits the markup in src/lib/richText.ts rather than contenteditable HTML,
 * which keeps three properties worth having: what is stored is exactly what
 * was typed, the AI writer can produce it as plain text, and nothing authored
 * here can ever become markup in a buyer's browser.
 *
 * The toolbar works on the textarea's own selection, so Bold with three words
 * highlighted wraps those three words and leaves the caret around them —
 * pressing it again takes the formatting back off.
 */
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/utils";
import { Bold, Eye, Italic, Link2, List, ListOrdered, Pencil } from "lucide-react";
import { insertLink, toggleLinePrefix, toggleWrap, type Edit } from "@/lib/richTextEditing";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
  /** Sits in the toolbar, to the left of the Write/Preview switch — the AI button goes here. */
  toolbarExtra?: ReactNode;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
  id,
  className,
  toolbarExtra,
}: RichTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");

  const apply = (fn: (value: string, start: number, end: number) => Edit) => {
    const el = ref.current;
    if (!el) return;
    const edit = fn(value, el.selectionStart, el.selectionEnd);
    onChange(edit.text);
    // The value lands via React, so the selection has to be restored after
    // the re-render or the caret jumps to the end of the box.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  const tools = [
    { key: "bold", label: "Bold", icon: Bold, run: () => apply((v, s, e) => toggleWrap(v, s, e, "**")) },
    { key: "italic", label: "Italic", icon: Italic, run: () => apply((v, s, e) => toggleWrap(v, s, e, "*")) },
    { key: "bullets", label: "Bulleted list", icon: List, run: () => apply((v, s, e) => toggleLinePrefix(v, s, e, false)) },
    { key: "numbers", label: "Numbered list", icon: ListOrdered, run: () => apply((v, s, e) => toggleLinePrefix(v, s, e, true)) },
    { key: "link", label: "Link", icon: Link2, run: () => apply(insertLink) },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/30 px-2 py-1.5">
        {tools.map((tool) => (
          <Button
            key={tool.key}
            type="button"
            variant="ghost"
            size="icon"
            title={tool.label}
            aria-label={tool.label}
            disabled={mode === "preview"}
            className="h-7 w-7"
            onClick={tool.run}
          >
            <tool.icon className="h-3.5 w-3.5" />
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          {toolbarExtra}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMode(mode === "write" ? "preview" : "write")}
          >
            {mode === "write" ? (
              <>
                <Eye className="mr-1 h-3.5 w-3.5" /> Preview
              </>
            ) : (
              <>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Write
              </>
            )}
          </Button>
        </div>
      </div>

      {mode === "write" ? (
        <textarea
          ref={ref}
          id={id}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const key = e.key.toLowerCase();
            if (key === "b") {
              e.preventDefault();
              apply((v, s, en) => toggleWrap(v, s, en, "**"));
            } else if (key === "i") {
              e.preventDefault();
              apply((v, s, en) => toggleWrap(v, s, en, "*"));
            }
          }}
          className="w-full resize-y bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      ) : (
        <div className="px-3 py-2" style={{ minHeight: `${rows * 1.5}rem` }}>
          <RichText
            value={value}
            className="text-sm"
            fallback={<p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
          />
        </div>
      )}

      <p className="border-t border-border bg-secondary/20 px-3 py-1.5 text-[11px] text-muted-foreground">
        <strong className="font-semibold">**bold**</strong> · <em>*italic*</em> · <code>- list</code> ·{" "}
        <code>[text](link)</code> · blank line for a new paragraph
      </p>
    </div>
  );
}
