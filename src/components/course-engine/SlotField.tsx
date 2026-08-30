import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Lightbulb, Loader2, Sparkles, X } from "lucide-react";

export interface SlotSuggestion {
  title: string;
  covers: string;
  learner_actions?: string[];
}

interface SlotFieldProps {
  /**
   * The slot's fixed purpose. Rendered as a label, never as a field — the
   * running order is the format, and a coach who renames "Bridge" to
   * something else has removed the reason the next day gets watched.
   */
  lockedLabel: string;
  /** "Teaches Step 2 — Content Strategy", when the slot is a teaching slot. */
  stepBadge?: string;
  title: string;
  covers: string;
  learnerActions?: string[];
  /** What the formula would write here. Always available, never applied for them. */
  suggestion?: SlotSuggestion;
  onChange: (patch: { title?: string; covers?: string; learner_actions?: string[] }) => void;
  /** Absent when this slot has no AI path — the coach has no provider connected. */
  onAskAi?: () => void;
  aiBusy?: boolean;
  titlePlaceholder?: string;
}

/**
 * One editable slot, with the suggestion sitting beside the field rather than
 * inside it.
 *
 * This is what makes manual mode worth using instead of a blank document: the
 * coach always has something correct to react to, but accepting it stays a
 * decision they make rather than text that was already there when they arrived.
 */
export function SlotField({
  lockedLabel,
  stepBadge,
  title,
  covers,
  learnerActions = [],
  suggestion,
  onChange,
  onAskAi,
  aiBusy,
  titlePlaceholder,
}: SlotFieldProps) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const empty = !title.trim() && !covers.trim();

  const applySuggestion = () => {
    if (!suggestion) return;
    onChange({
      title: suggestion.title,
      covers: suggestion.covers,
      ...(suggestion.learner_actions?.length ? { learner_actions: suggestion.learner_actions } : {}),
    });
    setShowSuggestion(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {lockedLabel}
        </Badge>
        {stepBadge && (
          <Badge variant="outline" className="font-normal">
            {stepBadge}
          </Badge>
        )}
        {empty && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            Not written yet
          </Badge>
        )}
      </div>

      <Input
        value={title}
        placeholder={titlePlaceholder ?? "Video title"}
        onChange={(event) => onChange({ title: event.target.value })}
      />

      <Textarea
        value={covers}
        placeholder="What this video covers"
        rows={3}
        onChange={(event) => onChange({ covers: event.target.value })}
      />

      <Input
        value={learnerActions.join(" • ")}
        placeholder="Learner actions, separated by •"
        onChange={(event) =>
          onChange({
            learner_actions: event.target.value
              .split("•")
              .map((action) => action.trim())
              .filter(Boolean),
          })
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {suggestion && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowSuggestion((open) => !open)}
          >
            <Lightbulb className="h-3.5 w-3.5 mr-1" />
            {showSuggestion ? "Hide suggestion" : "Show suggestion"}
          </Button>
        )}
        {onAskAi && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onAskAi}
            disabled={aiBusy}
          >
            {aiBusy ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            Ask AI for this slot
          </Button>
        )}
      </div>

      {showSuggestion && suggestion && (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-2">
          <p className="text-sm font-medium">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground">{suggestion.covers}</p>
          {suggestion.learner_actions?.length ? (
            <p className="text-xs text-muted-foreground">
              Actions: {suggestion.learner_actions.join(" • ")}
            </p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={applySuggestion}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Use this
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setShowSuggestion(false)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
