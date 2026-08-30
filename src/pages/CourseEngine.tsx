import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  Blocks,
  FileCheck2,
  Layers,
  Loader2,
  PencilLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/errorMessage";
import {
  createBlueprint,
  deleteBlueprint,
  listBlueprints,
  type BlueprintSummary,
} from "@/lib/blueprints";
import { SourceMaterial } from "@/components/course-engine/SourceMaterial";
import { Switch } from "@/components/ui/switch";
import { analyseSourceWithAi } from "@/lib/blueprints";
import { combineDocuments, type ExtractedDocument } from "@/lib/documentText";
import {
  buildPayload,
  deriveStepsFromTopic,
  detectCodex,
  hasUsableFields,
  type CodexFields,
  matchPreset,
  readCodexFields,
  type BlueprintLanguage,
  type BlueprintMode,
  type CourseInput,
  type TransformationStep,
} from "@/lib/courseEngine";

/**
 * Three ways to fill the same skeleton.
 *
 * They are presented as a choice up front because they cost different things:
 * the formula is instant and free, manual costs the coach's afternoon, and AI
 * costs credits. Burying that behind one "Create" button would mean spending
 * someone's credits on a decision they never made.
 */
const MODES: {
  id: BlueprintMode;
  title: string;
  cost: string;
  icon: typeof Blocks;
  description: string;
}[] = [
  {
    id: "formula",
    title: "Formula",
    cost: "Instant · free",
    icon: Blocks,
    description:
      "Every slot written from your five answers and the six steps. Nothing to wait for, nothing to spend, and a complete course you can edit line by line.",
  },
  {
    id: "manual",
    title: "Write it yourself",
    cost: "Your words",
    icon: PencilLine,
    description:
      "The structure and the fixed slot labels, with the formula's version sitting beside every field as a suggestion you can take or ignore.",
  },
  {
    id: "ai",
    title: "Generate with AI",
    cost: "Uses your AI provider",
    icon: Sparkles,
    description:
      "The model writes the prose into the same fixed slots. You approve the six steps first, and anything it leaves blank falls back to the formula.",
  },
];

const MODE_BADGE: Record<string, string> = {
  formula: "Formula",
  manual: "Written by hand",
  ai: "AI",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  steps_pending: "Steps not approved",
  steps_approved: "Being written",
  generating: "Generating",
  complete: "Ready",
  failed: "Generation failed",
};

const BLANK: CourseInput = {
  topic: "",
  audience: "",
  starting_pain: "",
  desired_result: "",
  coach_name: "",
  language: "en",
};

export default function CourseEngine() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<BlueprintMode>("formula");
  const [input, setInput] = useState<CourseInput>(BLANK);
  const [planText, setPlanText] = useState("");
  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [includeLive, setIncludeLive] = useState(true);
  const [codexSteps, setCodexSteps] = useState<TransformationStep[] | null>(null);
  const [reading, setReading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<BlueprintSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    listBlueprints(user.id)
      .then(setBlueprints)
      .catch((e: unknown) =>
        toast({
          title: "Could not load your blueprints",
          description: errorMessage(e),
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [user, toast]);

  const set = (patch: Partial<CourseInput>) => setInput((current) => ({ ...current, ...patch }));

  const combined = documents.length ? combineDocuments(documents) : null;
  const codex = combined ? detectCodex(combined.text) : null;

  /**
   * Fills only the fields the coach has left empty.
   *
   * Anything they typed themselves outranks anything read out of a file. A
   * form that overwrites what someone just wrote is worse than one that fills
   * nothing in at all.
   */
  const applyFields = (fields: CodexFields) =>
    setInput((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(fields)) {
        const field = key as keyof CourseInput;
        if (typeof value === "string" && value.trim() && !String(current[field] ?? "").trim()) {
          (next as Record<string, unknown>)[field] = value.trim();
        }
      }
      return next;
    });

  const onDocuments = (next: ExtractedDocument[]) => {
    setDocuments(next);
    if (!next.length) {
      setCodexSteps(null);
      return;
    }
    // Free and instant: whatever the document states outright, with no model
    // call and no waiting. The AI read below is for everything it only implies.
    const fields = readCodexFields(combineDocuments(next).text);
    if (hasUsableFields(fields)) applyFields(fields);
  };

  const readWithAi = async () => {
    if (!combined) return;
    setReading(true);
    try {
      const result = await analyseSourceWithAi(combined.text);
      applyFields(result.fields);
      if (result.steps) setCodexSteps(result.steps);

      toast({
        title: "Read your document",
        description: result.steps
          ? "Filled in the details and took the six steps from it — check them on the next screen."
          : "Filled in what it stated. It did not name six steps, so you will pick those next.",
      });
    } catch (e: unknown) {
      toast({ title: "Could not read it", description: errorMessage(e), variant: "destructive" });
    } finally {
      setReading(false);
    }
  };

  // All five are required because every one of them is interpolated into the
  // copy the engine writes. A blank leaves a hole mid-sentence in 15 videos.
  const ready = (["topic", "audience", "starting_pain", "desired_result", "coach_name"] as const).every(
    (field) => input[field].trim(),
  );
  const preset = input.topic ? matchPreset(input) : null;

  const handleCreate = async () => {
    if (!user || !ready) return;
    setCreating(true);
    try {
      const live_plan = planText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const full: CourseInput = {
        ...input,
        ...(live_plan.length ? { live_plan } : {}),
        ...(combined ? { source: combined.text } : {}),
      };

      // Every mode starts blank and goes through the steps checkpoint. Nothing
      // downstream is written until the six steps are approved, because
      // everything downstream is built out of them.
      const payload = buildPayload(full, codexSteps ?? deriveStepsFromTopic(full), {
        mode,
        fill: "blank",
        includeLive,
        isCodex: codex?.isCodex ?? false,
        sourceFiles: documents,
        sourceTruncated: combined?.truncated ?? false,
      });

      const blueprint = await createBlueprint({
        coachId: user.id,
        input: full,
        mode,
        payload,
        status: "steps_pending",
      });

      navigate(`/course-engine/${blueprint.id}`);
    } catch (e: unknown) {
      toast({
        title: "Could not create the blueprint",
        description: errorMessage(e),
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteBlueprint(target.id);
      setBlueprints((current) => current.filter((entry) => entry.id !== target.id));
      toast({ title: "Blueprint deleted" });
    } catch (e: unknown) {
      toast({
        title: "Could not delete it",
        description: errorMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold font-display flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" /> Course Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build a course on the Freedom Business Model: three foundation days, six bonuses, and
            live classes mapped to six transformation steps.
          </p>
        </div>

        {/* ── How it gets filled ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((option) => {
            const Icon = option.icon;
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-sm">{option.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{option.cost}</p>
                <p className="text-sm text-muted-foreground mt-2">{option.description}</p>
              </button>
            );
          })}
        </div>

        {/* ── The five inputs ── */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-sm">Tell it about the course</CardTitle>
            <CardDescription>
              Five answers. Everything the engine writes comes from these and the six steps you
              approve next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>What do you teach? *</Label>
              <Input
                placeholder="e.g. Instagram content creation"
                value={input.topic}
                onChange={(event) => set({ topic: event.target.value })}
              />
              {preset && (
                <p className="text-xs text-muted-foreground mt-1">
                  Recognised as {preset.label} — the six steps will start from that proven set.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Who is it for? *</Label>
                <Input
                  placeholder="e.g. Beginners who want to start on Instagram"
                  value={input.audience}
                  onChange={(event) => set({ audience: event.target.value })}
                />
              </div>
              <div>
                <Label>Where are they today? *</Label>
                <Input
                  placeholder="e.g. Zero followers, no idea what to post"
                  value={input.starting_pain}
                  onChange={(event) => set({ starting_pain: event.target.value })}
                />
              </div>
              <div>
                <Label>Where will they be after? *</Label>
                <Input
                  placeholder="e.g. Their first income from content online"
                  value={input.desired_result}
                  onChange={(event) => set({ desired_result: event.target.value })}
                />
              </div>
              <div>
                <Label>Your name *</Label>
                <Input
                  placeholder="The coach's name"
                  value={input.coach_name}
                  onChange={(event) => set({ coach_name: event.target.value })}
                />
              </div>
              <div>
                <Label>Language</Label>
                <Select
                  value={input.language ?? "en"}
                  onValueChange={(value) => set({ language: value as BlueprintLanguage })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="te">Telugu</SelectItem>
                    <SelectItem value="tinglish">Tinglish (mixed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Already run a challenge? Paste the days, one per line</Label>
              <Textarea
                rows={3}
                placeholder={"Day 1: pick your niche\nDay 2: set up the profile"}
                value={planText}
                onChange={(event) => setPlanText(event.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional. Your days are kept exactly as you wrote them and only tagged with the step
                each one builds.
              </p>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <SourceMaterial
                documents={documents}
                onChange={onDocuments}
                label="Build it from your own material"
                hint={
                  mode === "ai"
                    ? "Your Freedom Business Codex, a workbook, a deck, a transcript. Read in your browser — the file itself is never uploaded — and the course is written from what is in it."
                    : "Your Freedom Business Codex, a workbook, a deck or a transcript. Read in your browser and kept with the blueprint; the AI actions in the editor write from it."
                }
              />

              {codex?.isCodex && (
                <Alert>
                  <FileCheck2 className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium">This looks like a Freedom Business Codex.</span>{" "}
                    Anything it states plainly has been filled in below already. Have it read the
                    whole document to take the six steps, the promise and the earning model from it
                    too.
                  </AlertDescription>
                </Alert>
              )}

              {documents.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={readWithAi} disabled={reading}>
                    {reading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {reading ? "Reading the document…" : "Read it and fill everything in"}
                  </Button>
                  {codexSteps && (
                    <Badge variant="secondary" className="font-normal">
                      Six steps taken from your document
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">Uses your AI provider.</span>
                </div>
              )}
            </div>

            {/* ── What the programme includes ── */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">12 days of live classes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Two live sessions per transformation step. Turn this off for a recorded-only
                    programme — nothing else about the course changes.
                  </p>
                </div>
                <Switch checked={includeLive} onCheckedChange={setIncludeLive} aria-label="Include live classes" />
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-sm font-medium">Inner Circle Vault</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Added to every course, with a weekly Inner Circle call on the calendar. The three
                  days and the bonuses finish; the vault is the reason people stay. Edit or remove
                  it in the editor.
                </p>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={!ready || creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Start with the six steps
              {!creating && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </CardContent>
        </Card>

        {/* ── Existing blueprints ── */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Your blueprints</h2>

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && blueprints.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing yet. The first one takes about a minute.
            </p>
          )}

          {blueprints.map((blueprint) => (
            <Card key={blueprint.id} className="card-shadow">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{blueprint.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="font-normal">
                      {MODE_BADGE[blueprint.mode] ?? blueprint.mode}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {STATUS_LABEL[blueprint.status] ?? blueprint.status}
                    </Badge>
                    {blueprint.published_course_id && (
                      <Badge variant="outline" className="font-normal">
                        Published
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{blueprint.topic}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => navigate(`/course-engine/${blueprint.id}`)}>
                    Open
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPendingDelete(blueprint)}
                    aria-label="Delete blueprint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this blueprint?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} and its version history are removed. A course already published
              from it is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
