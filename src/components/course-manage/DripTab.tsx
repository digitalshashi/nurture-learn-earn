/**
 * Drip schedule — when each section opens up.
 *
 * What this writes is read back by src/lib/drip.ts on the landing page and in
 * the player, so a schedule set here actually holds. Section writes used to
 * go out unchecked, which meant a refused row still finished with "Saved!".
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeDripLocks } from "@/lib/drip";
import { CalendarDays, CheckCircle2, Clock, Loader2, Lock, Save, Unlock } from "lucide-react";

interface Props {
  courseId: string;
  course: any;
  onUpdate: () => void;
}

interface SectionRow {
  id: string;
  title: string;
  sort_order: number;
  drip_delay_days: number | null;
  drip_date: string | null;
  chapters: { id: string }[];
}

const DRIP_OPTIONS = [
  {
    value: "none",
    label: "No drip",
    icon: Unlock,
    description: "Everything is open from the moment someone enrols.",
  },
  {
    value: "enrollment",
    label: "After enrolling",
    icon: Clock,
    description: "Each section opens a set number of days after the learner enrols.",
  },
  {
    value: "date",
    label: "On a date",
    icon: CalendarDays,
    description: "Each section opens on a calendar date — the same date for everyone.",
  },
  {
    value: "completion",
    label: "By completion",
    icon: CheckCircle2,
    description: "A section opens once every lesson above it has been finished.",
  },
] as const;

export default function DripTab({ courseId, course, onUpdate }: Props) {
  const { toast } = useToast();
  const [dripType, setDripType] = useState<string>(course.drip_type || "none");
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("sections")
      .select("id, title, sort_order, drip_delay_days, drip_date, chapters(id)")
      .eq("course_id", courseId)
      .order("sort_order");
    setSections((data || []) as SectionRow[]);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: courseRow, error: courseError } = await supabase
        .from("courses")
        .update({ drip_type: dripType, updated_at: new Date().toISOString() })
        .eq("id", courseId)
        .select("id");
      if (courseError) throw courseError;
      if (!courseRow || courseRow.length === 0) {
        throw new Error("The schedule was not saved — you may not have permission to edit this course.");
      }

      // Each section is checked in turn: a row RLS refuses is invisible to
      // UPDATE rather than an error, so an unchecked write reports success
      // having changed nothing.
      for (const sec of sections) {
        const { data, error } = await supabase
          .from("sections")
          .update({
            drip_delay_days: sec.drip_delay_days || 0,
            drip_date: sec.drip_date || null,
          })
          .eq("id", sec.id)
          .select("id");
        if (error) throw new Error(`"${sec.title || "Untitled section"}": ${error.message}`);
        if (!data || data.length === 0) {
          throw new Error(`"${sec.title || "Untitled section"}" was not saved — check your permissions.`);
        }
      }

      toast({ title: "Schedule saved", description: "Learners see the new unlock times immediately." });
      onUpdate();
      await load();
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const update = (idx: number, patch: Partial<SectionRow>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  /** What a brand-new learner would see, so the schedule can be sanity-checked. */
  const preview = computeDripLocks({
    dripType,
    sections,
    enrolledAt: new Date().toISOString(),
    completedChapterIds: new Set(),
  });

  const needsPerSection = dripType === "enrollment" || dripType === "date";

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Drip schedule</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Release the course over time instead of all at once.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          {saving ? "Saving..." : "Save schedule"}
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {DRIP_OPTIONS.map((opt) => {
          const active = dripType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setDripType(opt.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-muted-foreground/40",
              )}
            >
              <div className="flex items-center gap-2">
                <opt.icon className={cn("h-4 w-4", active ? "text-accent" : "text-muted-foreground")} />
                <span className={cn("text-sm font-semibold", active && "text-accent")}>{opt.label}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{opt.description}</p>
            </button>
          );
        })}
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">No sections yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build the curriculum first — a schedule releases sections, so there is nothing to release.
            </p>
          </CardContent>
        </Card>
      ) : dripType === "none" ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium">Everything is open</p>
            <p className="text-sm text-muted-foreground">
              Learners can move through all {sections.length} sections in any order.
            </p>
          </CardContent>
        </Card>
      ) : dripType === "completion" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Unlock order</p>
          {sections.map((sec, i) => (
            <div key={sec.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {sec.title || `Section ${i + 1}`}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {i === 0
                  ? "Open from the start"
                  : `Opens after "${sections[i - 1].title || `Section ${i}`}" is finished`}
              </span>
            </div>
          ))}
        </div>
      ) : needsPerSection ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {dripType === "enrollment" ? "Delay per section" : "Unlock date per section"}
          </p>
          {sections.map((sec, i) => {
            const lock = preview.get(sec.id);
            return (
              <div key={sec.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{sec.title || `Section ${i + 1}`}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {sec.chapters?.length || 0} {sec.chapters?.length === 1 ? "lesson" : "lessons"}
                  </p>
                </div>
                {dripType === "enrollment" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={sec.drip_delay_days ?? 0}
                      onChange={(e) => update(i, { drip_delay_days: parseInt(e.target.value) || 0 })}
                      className="h-8 w-20 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">days after enrolling</span>
                  </div>
                ) : (
                  <Input
                    type="date"
                    value={sec.drip_date || ""}
                    onChange={(e) => update(i, { drip_date: e.target.value || null })}
                    className="h-8 w-40 shrink-0 text-sm"
                  />
                )}
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    lock?.locked ? "bg-secondary text-muted-foreground" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {lock?.locked ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                  {lock?.locked ? lock.reason : "Open on day one"}
                </span>
              </div>
            );
          })}
          <p className="pt-1 text-xs text-muted-foreground">
            The badge shows what someone enrolling today would see. Coaches and admins always see everything.
          </p>
        </div>
      ) : null}
    </div>
  );
}
