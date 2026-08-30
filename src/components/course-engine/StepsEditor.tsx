import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { wordCount, type TransformationStep } from "@/lib/courseEngine";

interface StepsEditorProps {
  steps: TransformationStep[];
  onChange: (steps: TransformationStep[]) => void;
  /** Re-derives from the topic presets. Free, instant, no model call. */
  onUsePreset: () => void;
  /** Absent when no AI provider is connected. */
  onDeriveWithAi?: () => void;
  aiBusy?: boolean;
  onApprove: () => void;
  approving?: boolean;
  approveLabel?: string;
}

/**
 * The human checkpoint, and the reason the whole feature is trustworthy.
 *
 * Everything downstream references these six steps, so they are shown, edited
 * and approved before a single video slot is written. Regenerating six steps
 * costs a moment; regenerating a whole course after discovering step 4 was
 * wrong costs the coach's afternoon.
 */
export function StepsEditor({
  steps,
  onChange,
  onUsePreset,
  onDeriveWithAi,
  aiBusy,
  onApprove,
  approving,
  approveLabel = "Approve & continue",
}: StepsEditorProps) {
  const update = (number: number, patch: Partial<TransformationStep>) =>
    onChange(steps.map((step) => (step.number === number ? { ...step, ...patch } : step)));

  // The 2-to-4-word rule is enforced on save, so it is shown while typing
  // rather than sprung afterwards.
  const badNames = steps.filter((step) => {
    const words = wordCount(step.name);
    return words < 2 || words > 4;
  });
  const missingAchievement = steps.filter((step) => !step.achievement.trim());
  const ready = badNames.length === 0 && missingAchievement.length === 0;

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">The 6 Transformation Steps</CardTitle>
            <CardDescription>
              Each one a concrete milestone, named in 2 to 4 plain words, in the order they have to
              happen. Everything else in the course is built from these, so get them right first.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onUsePreset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to formula
            </Button>
            {onDeriveWithAi && (
              <Button type="button" variant="outline" size="sm" onClick={onDeriveWithAi} disabled={aiBusy}>
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Derive with AI
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {steps.map((step) => {
          const words = wordCount(step.name);
          const nameOk = words >= 2 && words <= 4;

          return (
            <div key={step.number} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">
                  Step {step.number}
                </Badge>
                <Input
                  value={step.name}
                  placeholder="Step name"
                  onChange={(event) => update(step.number, { name: event.target.value })}
                  className={nameOk ? "" : "border-destructive"}
                />
                <span
                  className={`text-xs shrink-0 tabular-nums ${nameOk ? "text-muted-foreground" : "text-destructive"}`}
                >
                  {words}/2-4
                </span>
              </div>
              <Textarea
                value={step.achievement}
                placeholder="What the student can point at once this step is done"
                rows={2}
                onChange={(event) => update(step.number, { achievement: event.target.value })}
              />
            </div>
          );
        })}

        {!ready && (
          <Alert>
            <AlertDescription className="text-sm">
              {badNames.length > 0 && (
                <span>
                  Rename {badNames.map((step) => `step ${step.number}`).join(", ")} to 2-4 words.{" "}
                </span>
              )}
              {missingAchievement.length > 0 && (
                <span>
                  Say what the student achieves in{" "}
                  {missingAchievement.map((step) => `step ${step.number}`).join(", ")}.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button type="button" onClick={onApprove} disabled={!ready || approving} className="w-full">
          {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {approveLabel}
          {!approving && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </CardContent>
    </Card>
  );
}
