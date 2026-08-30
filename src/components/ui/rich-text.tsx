/**
 * Renders a formatted description.
 *
 * Every node type in the tree maps to a fixed element here, so the only thing
 * an author can influence is the text inside one. There is no HTML string
 * anywhere in this path — see src/lib/richText.ts for why that matters.
 */
import { Fragment, type ReactNode } from "react";
import { parseRichText, type BlockNode, type InlineNode } from "@/lib/richText";
import { safeUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

function renderInline(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.value}</Fragment>;
      case "break":
        return <br key={i} />;
      case "bold":
        return <strong key={i} className="font-semibold">{renderInline(node.children)}</strong>;
      case "italic":
        return <em key={i}>{renderInline(node.children)}</em>;
      case "link": {
        // safeUrl drops javascript: and data: targets. A link that does not
        // survive it is shown as its own label rather than silently vanishing.
        const href = safeUrl(node.href);
        if (!href) return <Fragment key={i}>{renderInline(node.children)}</Fragment>;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium text-accent underline underline-offset-2 hover:no-underline"
          >
            {renderInline(node.children)}
          </a>
        );
      }
    }
  });
}

function renderBlock(block: BlockNode, key: number): ReactNode {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="leading-relaxed">
        {renderInline(block.children)}
      </p>
    );
  }

  const items = block.items.map((item, i) => (
    <li key={i} className="leading-relaxed">
      {renderInline(item)}
    </li>
  ));

  return block.type === "bullets" ? (
    <ul key={key} className="list-disc space-y-1 pl-5">
      {items}
    </ul>
  ) : (
    <ol key={key} className="list-decimal space-y-1 pl-5">
      {items}
    </ol>
  );
}

export function RichText({
  value,
  className,
  /** Shown when there is nothing to render, so a preview pane is never blank. */
  fallback,
}: {
  value: string | null | undefined;
  className?: string;
  fallback?: ReactNode;
}) {
  const blocks = parseRichText(value);
  if (blocks.length === 0) return fallback ? <>{fallback}</> : null;

  return (
    <div className={cn("space-y-3", className)}>{blocks.map((block, i) => renderBlock(block, i))}</div>
  );
}
