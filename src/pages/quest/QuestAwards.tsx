import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Medal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { LockedPanel, StatusPill } from "@/components/quest/QuestPrimitives";
import type { AwardRow } from "@/lib/quest/awards";
import { cn } from "@/lib/utils";

/**
 * The ladder, rendered as a ladder.
 *
 * Every rung is on screen at once, including the ones a member will not reach
 * this year. Hiding them would make the ladder shorter and the climb
 * pointless — the whole mechanic is being able to see the top.
 */
export default function QuestAwards() {
  const navigate = useNavigate();
  const quest = useQuest();
  const [applying, setApplying] = useState<AwardRow | null>(null);

  if (!quest.gate.unlocked) {
    return (
      <LockedPanel
        title="Awards open after setup"
        description="The first rung is finishing your profile and the handbook. Do that and the ladder appears."
        action={<Button size="sm" onClick={() => navigate("/quest")}>Back to the gate</Button>}
      />
    );
  }

  const held = quest.awards.filter((row) => row.status === "achieved").length;

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

      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
          <Medal className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Award journey</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Current level:{" "}
            <span className="font-medium text-foreground">
              {quest.awardLevel?.title ?? "Nothing held yet"}
            </span>{" "}
            · {held} of {quest.awards.length} rungs
          </p>
        </div>
      </header>

      <ol className="relative space-y-2 pl-6">
        {/* The rail the medals hang off, so the list reads as one climb. */}
        <span className="absolute bottom-6 left-[11px] top-6 w-px bg-border" aria-hidden />

        {quest.awards.map((row, index) => (
          <motion.li
            key={row.award.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="relative"
          >
            <span
              className={cn(
                "absolute -left-6 top-5 grid h-6 w-6 place-items-center rounded-full border-2 bg-background",
                row.status === "achieved" ? "border-success" : "border-border",
              )}
              aria-hidden
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  row.status === "achieved" ? "bg-success" : "bg-muted-foreground/40",
                )}
              />
            </span>

            <AwardCard row={row} onApply={() => setApplying(row)} />
          </motion.li>
        ))}
      </ol>

      <p className="mt-5 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        The lower rungs unlock themselves the moment you meet the condition. The revenue rungs are
        applied for and read by a person — a milestone nobody checks is worth nothing to the member
        standing next to you.
      </p>

      {applying && <ApplyDialog row={applying} onClose={() => setApplying(null)} />}
    </div>
  );
}

function AwardCard({ row, onApply }: { row: AwardRow; onApply: () => void }) {
  const { award, status, blockedBy } = row;
  const dim = status === "locked";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-opacity",
        status === "achieved" ? "border-success/25" : "border-border",
        dim && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{
            backgroundColor: `hsl(${award.hue} / 0.14)`,
            color: `hsl(${award.hue})`,
          }}
        >
          <award.icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-semibold">{award.title}</p>
            <StatusPill status={status} />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{award.requirement}</p>
          {award.threshold && (
            <p className="mt-1 text-[11px] font-medium tabular-nums text-muted-foreground">
              Requirement: {award.threshold}
            </p>
          )}
          {blockedBy && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Achieve <span className="font-medium text-foreground">{blockedBy}</span> first.
            </p>
          )}
        </div>

        {status === "apply" && (
          <Button size="sm" onClick={onApply} className="shrink-0 self-center">
            Apply now
          </Button>
        )}
      </div>
    </div>
  );
}

function ApplyDialog({ row, onClose }: { row: AwardRow; onClose: () => void }) {
  const { user } = useAuth();
  const quest = useQuest();
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || evidence.trim().length < 20) {
      toast({
        title: "Say a bit more",
        description: "A reviewer needs enough to check the claim against.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);

    // status is left at its default. The insert policy pins it to 'pending',
    // so sending anything else here would be rejected rather than honoured.
    const { error } = await supabase.from("quest_award_applications").insert({
      user_id: user.id,
      award_key: row.award.key,
      evidence: evidence.trim(),
    });

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }

    await quest.refresh();
    onClose();
    toast({
      title: "Application submitted",
      description: "It sits as pending until somebody reviews it.",
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <row.award.icon className="h-5 w-5" style={{ color: `hsl(${row.award.hue})` }} />
            Apply for {row.award.title}
          </DialogTitle>
          <DialogDescription>{row.award.requirement}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {row.award.threshold && (
            <p className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              Requirement: <span className="font-medium text-foreground">{row.award.threshold}</span>
            </p>
          )}

          <div>
            <Label className="text-xs font-medium">What should the reviewer look at?</Label>
            <Textarea
              className="mt-1.5 min-h-32"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Where the revenue came from, over what period, and how a reviewer can verify it. Be specific — vague claims get sent back."
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              This goes to a human. Nothing is granted automatically at this level.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Submit application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
