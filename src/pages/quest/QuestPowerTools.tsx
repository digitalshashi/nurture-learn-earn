import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wrench, Download, RefreshCw, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { ProgressRing, QuestRow, LockedPanel } from "@/components/quest/QuestPrimitives";
import { scorecardScore, toolExport, toolIsAnswered, type ToolAnswers } from "@/lib/quest/powerTools";
import type { ToolRow } from "@/lib/quest/progress";
import { cn } from "@/lib/utils";

/**
 * The seven-step chain, with its aggregate score on top.
 *
 * Exactly one row is open at a time. The rest stay on screen, dimmed and
 * locked, because a chain you cannot see the end of is just a button.
 */
export default function QuestPowerTools() {
  const navigate = useNavigate();
  const quest = useQuest();
  const [open, setOpen] = useState<ToolRow | null>(null);

  if (!quest.gate.unlocked) {
    return (
      <LockedPanel
        title="Power Tools open after setup"
        description="The chain builds on your profile and assumes you have read the handbook. Finish both and it unlocks."
        action={<Button size="sm" onClick={() => navigate("/quest")}>Back to the gate</Button>}
      />
    );
  }

  const { tools } = quest;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/quest")}
        className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Quest
      </button>

      {/* Business Potency */}
      <section className="mb-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-5">
          <ProgressRing value={tools.potency} size={104}>
            <div>
              <p className="font-display text-2xl font-bold tabular-nums">{tools.potency}</p>
              <p className="-mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">of 100</p>
            </div>
          </ProgressRing>

          <div className="min-w-[200px] flex-1">
            <p className="font-display text-base font-semibold">Business Potency · {tools.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tools.complete} of {tools.total} tools complete. Each one adds its own weight, and the
              scored ones add it in proportion to what they scored.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tools.next ? (
                <Button size="sm" onClick={() => setOpen(tools.next)}>
                  <Play className="mr-1.5 h-4 w-4" />
                  Continue: {tools.next.tool.name}
                </Button>
              ) : (
                <span className="text-xs font-medium text-success">Every tool finished.</span>
              )}
              <Button size="sm" variant="outline" onClick={() => void quest.refresh()}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Resync
              </Button>
            </div>
          </div>
        </div>
      </section>

      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Tool details
      </h2>

      <div className="space-y-2">
        {tools.rows.map((row, index) => (
          <QuestRow
            key={row.tool.key}
            index={index + 1}
            icon={row.tool.icon}
            title={row.tool.name}
            status={row.status}
            description={
              row.status === "done" && row.summary
                ? row.summary
                : row.status === "locked"
                  ? `${row.tool.tagline} Unlocks after step ${index}.`
                  : `${row.tool.tagline} About ${row.tool.minutes} minutes.`
            }
            onClick={row.status === "locked" ? undefined : () => setOpen(row)}
            action={
              row.status === "locked" ? null : (
                <div className="flex items-center gap-1.5">
                  {row.status === "done" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        void downloadTool(row.tool.key, row.tool.name);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download {row.tool.name}</span>
                    </Button>
                  )}
                  <Button size="sm" variant={row.status === "next" ? "default" : "outline"}>
                    {row.status === "next" ? "Start now" : "Re-open"}
                  </Button>
                </div>
              )
            }
          />
        ))}
      </div>

      {open && <ToolDialog row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Pulls the stored artefact and hands it over as a .txt. */
async function downloadTool(toolKey: string, toolName: string) {
  const { data } = await supabase
    .from("quest_power_tool_runs")
    .select("output")
    .eq("tool_key", toolKey)
    .maybeSingle();

  const text = data?.output;
  if (!text) {
    toast({ title: "Nothing to download yet", variant: "destructive" });
    return;
  }

  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${toolKey}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  toast({ title: `${toolName} exported` });
}

function ToolDialog({ row, onClose }: { row: ToolRow; onClose: () => void }) {
  const { user } = useAuth();
  const quest = useQuest();
  const tool = row.tool;
  const [answers, setAnswers] = useState<ToolAnswers>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Re-opening a finished tool has to show what was written last time, or
  // "Re-open" is just "start again" with a friendlier label.
  useEffect(() => {
    let live = true;
    void supabase
      .from("quest_power_tool_runs")
      .select("answers")
      .eq("tool_key", tool.key)
      .maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        const stored = (data?.answers ?? {}) as Record<string, unknown>;
        setAnswers(
          Object.fromEntries(
            Object.entries(stored).map(([key, value]) => [key, String(value ?? "")]),
          ),
        );
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [tool]);

  const answered = toolIsAnswered(tool, answers);

  const finish = async () => {
    if (!user || !answered) return;
    setSaving(true);

    const score = tool.scored ? scorecardScore(answers, tool) : null;
    const completedAt = new Date();

    const { error } = await supabase.from("quest_power_tool_runs").upsert(
      {
        user_id: user.id,
        tool_key: tool.key,
        status: "done",
        score,
        summary: tool.summarize(answers, score),
        answers,
        output: toolExport(tool, answers, quest.displayName, completedAt),
        completed_at: completedAt.toISOString(),
        updated_at: completedAt.toISOString(),
      },
      { onConflict: "user_id,tool_key" },
    );

    if (error) {
      setSaving(false);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }

    // XP only on the first completion — re-opening a tool to tidy an answer
    // is not worth paying for again.
    if (row.status !== "done") {
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        action: "power_tool",
        xp_amount: 100,
        description: `${tool.name} completed`,
      });
    }

    setSaving(false);
    await quest.refresh();
    onClose();
    toast({
      title: `${tool.name} complete`,
      description: row.status === "done" ? "Your answers were updated." : "+100 XP. Next tool unlocked.",
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <tool.icon className="h-5 w-5 text-accent" />
            {tool.name}
          </DialogTitle>
          <DialogDescription>{tool.tagline}</DialogDescription>
        </DialogHeader>

        {!loaded ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {tool.fields.map((field) => (
              <div key={field.key}>
                <Label className="text-xs font-medium">{field.label}</Label>

                {field.type === "textarea" && (
                  <Textarea
                    className="mt-1.5 min-h-24"
                    value={answers[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}

                {field.type === "text" && (
                  <Input
                    className="mt-1.5"
                    value={answers[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}

                {field.type === "scale" && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
                      const chosen = Number(answers[field.key]) === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [field.key]: String(value) }))
                          }
                          aria-pressed={chosen}
                          className={cn(
                            "h-8 w-8 rounded-lg border text-xs font-semibold tabular-nums transition-colors",
                            chosen
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border hover:border-accent hover:text-accent",
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                )}

                {field.help && <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>}
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                {answered
                  ? tool.scored
                    ? `Scores ${scorecardScore(answers, tool)}/100.`
                    : "Everything answered."
                  : "Answer every field to finish this tool."}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={finish} disabled={!answered || saving}>
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {row.status === "done" ? "Save changes" : "Finish tool"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

