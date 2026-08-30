import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiWriter, type AiField } from "@/hooks/useAiWriter";

/**
 * Drop-in "write this for me" control for any form.
 *
 * The prompt is assembled from what is already on screen, so the common case
 * is one click. The instructions box is there for steering ("shorter", "in
 * Hindi"), not for describing the task from scratch.
 */
export function AiWriteButton<T extends Record<string, string>>({
  task,
  context,
  fields,
  onResult,
  label = "Write with AI",
  disabled,
  className,
}: {
  /** What is being written, e.g. "a WhatsApp broadcast". */
  task: string;
  /** Labelled facts from the form. Blank values are dropped. */
  context?: Record<string, string | number | null | undefined>;
  fields: AiField[];
  onResult: (result: T) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { generate, generating } = useAiWriter();
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");

  const run = async () => {
    const result = await generate<T>({ task, context, fields, instructions });
    if (!result) return;
    onResult(result);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || generating}
          className={cn("gap-1.5", className)}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-xs font-medium">Write {task}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Uses what you have filled in already. Add a note only if you want to steer it.
          </p>
        </div>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Optional — e.g. keep it under 60 words, friendly tone, in Hindi"
          rows={3}
          className="text-xs"
        />
        <Button
          size="sm"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={run}
          disabled={generating}
        >
          {generating && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
          Generate
        </Button>
      </PopoverContent>
    </Popover>
  );
}
