import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/errorMessage";
import { BonusesTab } from "@/components/course-engine/BonusesTab";
import { FoundationTab } from "@/components/course-engine/FoundationTab";
import { LiveTab } from "@/components/course-engine/LiveTab";
import { OverviewTab } from "@/components/course-engine/OverviewTab";
import { StepsEditor } from "@/components/course-engine/StepsEditor";
import type { SlotSuggestion } from "@/components/course-engine/SlotField";
import {
  deriveStepsWithAi,
  generatePartsWithAi,
  getBlueprint,
  publishBlueprint,
  saveBlueprint,
  suggestSlotWithAi,
  type Blueprint,
  type GenerationSection,
} from "@/lib/blueprints";
import {
  applyGeneratedBonuses,
  applyGeneratedFoundation,
  applyGeneratedLive,
  buildPayload,
  countChapters,
  deriveStepsFromTopic,
  isPublishable,
  markdownFilename,
  refreshDerived,
  renderMarkdown,
  toCourseOutline,
  toInput,
  validateStructure,
  type BlueprintStatus,
  type CoursePayload,
  type TransformationStep,
} from "@/lib/courseEngine";

const APPROVE_LABEL: Record<string, string> = {
  formula: "Approve & build the whole course",
  manual: "Approve & start writing",
  ai: "Approve & generate with AI",
};

export default function CourseBlueprintEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [payload, setPayload] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirmPublish, setConfirmPublish] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBlueprint(id)
      .then((row) => {
        if (!row) {
          toast({ title: "Blueprint not found", variant: "destructive" });
          navigate("/course-engine");
          return;
        }
        setBlueprint(row);
        setPayload(row.payload);
      })
      .catch((e: unknown) =>
        toast({
          title: "Could not open it",
          description: errorMessage(e),
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  /**
   * Autosave, debounced.
   *
   * No snapshot is taken here: one version per pause in typing would bury the
   * ones that matter. Snapshots are attached to the destructive writes —
   * approving, generating, regenerating — which is where a coach actually
   * needs to get something back.
   */
  useEffect(() => {
    if (!blueprint || !payload || !dirty) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const next = await saveBlueprint(blueprint, payload);
        setBlueprint(next);
        setDirty(false);
      } catch (e: unknown) {
        toast({
          title: "Could not save",
          description: errorMessage(e),
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [payload, dirty, blueprint, toast]);

  const edit = useCallback((next: CoursePayload) => {
    setPayload(next);
    setDirty(true);
  }, []);

  /** A write worth remembering: snapshots the previous version and bumps. */
  const commit = async (next: CoursePayload, note: string, status?: BlueprintStatus) => {
    if (!blueprint) return;
    const saved = await saveBlueprint(blueprint, next, { note, status });
    setBlueprint(saved);
    setPayload(saved.payload);
    setDirty(false);
  };

  const setSteps = (steps: TransformationStep[]) => {
    if (!payload) return;
    // The value stack names the six steps and counts the sessions, so it is
    // rebuilt when they move. Positioning is left alone: it is the coach's own
    // prose, and rewriting it under them on a step edit would be theft.
    edit(refreshDerived({ ...payload, steps }));
  };

  const deriveWithAi = async () => {
    if (!payload) return;
    setBusy("steps");
    try {
      const result = await deriveStepsWithAi(toInput(payload));
      setSteps(result.steps);
      toast({ title: "Six steps derived", description: `${result.tokens_used} tokens used.` });
    } catch (e: unknown) {
      toast({
        title: "Could not derive the steps",
        description: errorMessage(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  /** The checkpoint. What happens next depends entirely on the chosen mode. */
  const approveSteps = async () => {
    if (!payload || !blueprint) return;
    const input = toInput(payload);
    setBusy("approve");
    setWarnings([]);

    try {
      if (blueprint.mode === "manual") {
        await commit(payload, "Steps approved", "steps_approved");
        toast({ title: "Steps approved", description: "Every slot has a suggestion waiting beside it." });
        return;
      }

      if (blueprint.mode === "formula") {
        const built = buildPayload(input, payload.steps, { mode: "formula", fill: "suggested" });
        await commit({ ...built, meta: { ...built.meta, course_name: payload.meta.course_name } }, "Built from the formula", "complete");
        toast({ title: "Course built", description: "15 videos, 6 bonuses and the live plan are filled in." });
        return;
      }

      // AI: build the formula version first, then let the model's prose win
      // wherever it returned something usable. That way a call that half-fails
      // still leaves a complete course rather than a hole.
      const skeleton = buildPayload(input, payload.steps, { mode: "ai", fill: "suggested" });
      const generated = await generatePartsWithAi(input, payload.steps);

      let next = applyGeneratedFoundation(skeleton, generated.foundation);
      next = applyGeneratedBonuses(next, { bonuses: generated.bonuses });
      next = applyGeneratedLive(next, generated.live);
      next = refreshDerived({ ...next, meta: { ...next.meta, course_name: payload.meta.course_name } });

      await commit(next, "Generated with AI", "complete");
      setWarnings(generated.warnings ?? []);
      toast({
        title: "Course generated",
        description: `${generated.tokens_used} tokens used.`,
      });
    } catch (e: unknown) {
      toast({
        title: "Generation failed",
        description: errorMessage(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Regenerates one part only.
   *
   * Scoped on the server as well as here, so it is one model call rather than
   * five — and a coach who dislikes the bonuses cannot lose the foundation
   * they spent the morning editing.
   */
  const regenerate = async (sections: GenerationSection[], label: string) => {
    if (!payload) return;
    setBusy(label);
    setWarnings([]);
    try {
      const input = toInput(payload);
      const generated = await generatePartsWithAi(input, payload.steps, sections);

      let next = payload;
      if (sections.some((section) => section.startsWith("day"))) {
        next = applyGeneratedFoundation(next, generated.foundation);
      }
      if (sections.includes("bonuses")) {
        next = applyGeneratedBonuses(next, { bonuses: generated.bonuses });
      }
      if (sections.includes("live")) {
        next = applyGeneratedLive(next, generated.live);
      }

      await commit(next, `Regenerated: ${label}`);
      setWarnings(generated.warnings ?? []);
      toast({ title: "Regenerated", description: `${generated.tokens_used} tokens used.` });
    } catch (e: unknown) {
      toast({
        title: "Could not regenerate",
        description: errorMessage(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  /** One slot, on request, for a coach who is stuck on it. */
  const requestSlotSuggestion = async (
    target: Record<string, unknown>,
    existing: { title: string; covers: string },
  ): Promise<SlotSuggestion | null> => {
    if (!payload) return null;
    try {
      const result = await suggestSlotWithAi(toInput(payload), payload.steps, target, existing);
      return result.suggestion;
    } catch (e: unknown) {
      toast({
        title: "No suggestion",
        description: errorMessage(e),
        variant: "destructive",
      });
      return null;
    }
  };

  const exportMarkdown = () => {
    if (!payload) return;
    const blob = new Blob([renderMarkdown(payload)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = markdownFilename(payload);
    link.click();
    URL.revokeObjectURL(url);
  };

  const publish = async () => {
    if (!payload || !blueprint || !user) return;
    setConfirmPublish(false);
    setBusy("publish");
    try {
      const result = await publishBlueprint(blueprint, payload, user.id);
      toast({
        title: "Course created",
        description: `${result.chapters} lessons across ${toCourseOutline(payload).sections.length} sections.`,
      });
      navigate(`/course-builder/${result.courseId}`);
    } catch (e: unknown) {
      toast({
        title: "Could not publish",
        description: errorMessage(e),
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  if (loading || !blueprint || !payload) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto py-10 px-4 text-sm text-muted-foreground">
          {loading ? "Loading…" : "Nothing to show."}
        </div>
      </AppLayout>
    );
  }

  const structural = validateStructure(payload);
  const canPublish = isPublishable(payload) && !blueprint.published_course_id;
  const atCheckpoint = blueprint.status === "steps_pending";
  const aiSection = (section: GenerationSection[], label: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => regenerate(section, label)}
      disabled={busy !== null}
    >
      {busy === label ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
      )}
      Regenerate with AI
    </Button>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2 mb-1 text-xs"
              onClick={() => navigate("/course-engine")}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              All blueprints
            </Button>
            <h1 className="text-xl font-bold font-display truncate">{payload.meta.course_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="font-normal">
                {blueprint.mode === "ai" ? "AI" : blueprint.mode === "manual" ? "Written by hand" : "Formula"}
              </Badge>
              <Badge variant="outline" className="font-normal">
                v{blueprint.version}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportMarkdown}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export .md
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmPublish(true)}
              disabled={!canPublish || busy !== null}
            >
              {busy === "publish" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Rocket className="h-3.5 w-3.5 mr-1.5" />
              )}
              {blueprint.published_course_id ? "Already published" : "Publish as a course"}
            </Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Some sections fell back to the formula.</span>{" "}
              {warnings.join(" ")} Review those and rewrite anything that reads thin.
            </AlertDescription>
          </Alert>
        )}

        {structural.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{structural[0].message}</AlertDescription>
          </Alert>
        )}

        {atCheckpoint ? (
          <StepsEditor
            steps={payload.steps}
            onChange={setSteps}
            onUsePreset={() => setSteps(deriveStepsFromTopic(toInput(payload)))}
            onDeriveWithAi={deriveWithAi}
            aiBusy={busy === "steps"}
            onApprove={approveSteps}
            approving={busy === "approve"}
            approveLabel={APPROVE_LABEL[blueprint.mode] ?? "Approve & continue"}
          />
        ) : (
          <Tabs defaultValue="foundation">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="steps">6 Steps</TabsTrigger>
              <TabsTrigger value="foundation">Foundation</TabsTrigger>
              <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewTab payload={payload} onChange={edit} />
            </TabsContent>

            <TabsContent value="steps" className="mt-4">
              <StepsEditor
                steps={payload.steps}
                onChange={setSteps}
                onUsePreset={() => setSteps(deriveStepsFromTopic(toInput(payload)))}
                onDeriveWithAi={deriveWithAi}
                aiBusy={busy === "steps"}
                onApprove={() => commit(payload, "Steps edited")}
                approving={busy === "approve"}
                approveLabel="Save the steps"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Changing a step does not rewrite the videos that teach it. Regenerate or edit those
                yourself so nothing you have written is thrown away behind your back.
              </p>
            </TabsContent>

            <TabsContent value="foundation" className="mt-4 space-y-3">
              <div className="flex justify-end">{aiSection(["day1", "day2", "day3"], "the 3 days")}</div>
              <FoundationTab
                payload={payload}
                onChange={edit}
                requestSlotSuggestion={requestSlotSuggestion}
              />
            </TabsContent>

            <TabsContent value="bonuses" className="mt-4 space-y-3">
              <div className="flex justify-end">{aiSection(["bonuses"], "the bonuses")}</div>
              <BonusesTab
                payload={payload}
                onChange={edit}
                requestSlotSuggestion={requestSlotSuggestion}
              />
            </TabsContent>

            <TabsContent value="live" className="mt-4 space-y-3">
              <div className="flex justify-end">{aiSection(["live"], "the live classes")}</div>
              <LiveTab payload={payload} onChange={edit} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this blueprint as a course?</AlertDialogTitle>
            <AlertDialogDescription>
              It creates an unpublished course with{" "}
              {toCourseOutline(payload).sections.length} sections and{" "}
              {countChapters(toCourseOutline(payload))} lessons, ready for you to add the videos.
              The blueprint stays here and stays editable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={publish}>Create the course</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
