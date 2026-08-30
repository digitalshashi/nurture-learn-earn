/**
 * Copy, with proof that it worked.
 *
 * There are up to three copy targets on every row of the sales table and one
 * on every membership card, so the confirmation has to be local to the button
 * pressed — a toast would say "Copied!" without saying *what*, and firing one
 * per press would bury the screen. The button reports on itself instead.
 *
 * The clipboard API rejects outright on an insecure origin and in some
 * embedded webviews. That case falls back to a toast carrying the value, so
 * the member can still select it by hand rather than being told nothing.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  /** Announced to screen readers, e.g. "Copy affiliate link". */
  label: string;
  /** Shown beside the icon. Icon-only when omitted, for table cells. */
  children?: React.ReactNode;
  className?: string;
  size?: "icon" | "sm";
  variant?: "ghost" | "outline";
}

export function CopyButton({
  value,
  label,
  children,
  className,
  size = "icon",
  variant = "ghost",
}: CopyButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A row can unmount while its confirmation is still counting down — the
  // sales table repaginates under the cursor.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy", description: value, variant: "destructive" });
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size === "icon" ? "icon" : "sm"}
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={label}
      className={cn(size === "icon" && "h-7 w-7 shrink-0", className)}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {children && <span className="ml-1.5">{copied ? "Copied!" : children}</span>}
    </Button>
  );
}
