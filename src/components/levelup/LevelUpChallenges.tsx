import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/useTabParam";
import { Plus, Link2, Upload, Image as ImageIcon, Loader2, Trophy, ChevronDown, ChevronUp } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  xp_reward: number;
  points_per_submission: number;
  created_by: string | null;
}

interface Participation {
  id: string;
  challenge_id: string;
  progress_percent: number;
  is_completed: boolean;
  joined_at: string;
}

interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  submission_type: string;
  url: string;
  note: string | null;
  created_at: string;
}

const emptyChallengeForm = {
  title: "",
  description: "",
  duration_days: 30,
  xp_reward: 200,
  points_per_submission: 10,
};

export function LevelUpChallenges() {
  // Section lives in the URL so links, refreshes and analytics all point
  // at the section actually being viewed.
  const [activeTab, setActiveTab] = useTabParam(["active", "all"] as const);
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasRole("coach") || hasRole("admin") || hasRole("super_admin");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyChallengeForm });

  const [submitFor, setSubmitFor] = useState<Challenge | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("gamification_challenges").select("*").eq("is_active", true);
    setChallenges((c as any) || []);
    const { data: p } = await supabase.from("challenge_participants").select("*").eq("user_id", user.id);
    setParticipations(p || []);
    const { data: s } = await supabase
      .from("challenge_submissions" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMySubmissions((s as any) || []);
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;
    await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: user.id });
    loadData();
    toast({ title: "Challenge joined!" });
  };

  const createChallenge = async () => {
    if (!user || !form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("gamification_challenges").insert({
      title: form.title,
      description: form.description || null,
      duration_days: form.duration_days,
      xp_reward: form.xp_reward,
      points_per_submission: form.points_per_submission,
      created_by: user.id,
      is_active: true,
    } as any);
    setCreating(false);
    if (error) {
      toast({ title: "Couldn't create challenge", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Challenge created!" });
    setCreateOpen(false);
    setForm({ ...emptyChallengeForm });
    loadData();
  };

  const getParticipation = (cId: string) => participations.find((p) => p.challenge_id === cId);
  const submissionsFor = (cId: string) => mySubmissions.filter((s) => s.challenge_id === cId);
  const activeChallenges = challenges.filter((c) => {
    const p = getParticipation(c.id);
    return p && !p.is_completed;
  });
  const allChallenges = challenges;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Active Challenges</p>
            <p className="text-2xl font-bold text-accent">{activeChallenges.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">All Challenges</p>
            <p className="text-2xl font-bold text-success">{allChallenges.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="active">My Challenges</TabsTrigger>
            <TabsTrigger value="all">All Challenges</TabsTrigger>
          </TabsList>
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setForm({ ...emptyChallengeForm });
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New challenge
            </Button>
          )}
        </div>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeChallenges.length === 0 && (
            <Card className="card-shadow">
              <CardContent className="py-12 text-center">
                <p className="font-bold text-lg">No Active Challenge Found</p>
                <p className="text-sm text-muted-foreground mt-1">Go to "All Challenges" tab to view and join them</p>
              </CardContent>
            </Card>
          )}
          {activeChallenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              participation={getParticipation(c.id)}
              submissions={submissionsFor(c.id)}
              expanded={expandedId === c.id}
              onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
              joined
              onJoin={() => joinChallenge(c.id)}
              onSubmit={() => setSubmitFor(c)}
            />
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {allChallenges.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              participation={getParticipation(c.id)}
              submissions={submissionsFor(c.id)}
              expanded={expandedId === c.id}
              onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
              joined={!!getParticipation(c.id)}
              onJoin={() => joinChallenge(c.id)}
              onSubmit={() => setSubmitFor(c)}
            />
          ))}
          {allChallenges.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No challenges available yet</p>}
        </TabsContent>
      </Tabs>

      {/* Create challenge (coach/admin) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New challenge</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 100 Days, 100 Reels" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should members do, and how do they prove it?" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Duration (days)</Label>
                <Input type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Math.max(1, parseInt(e.target.value) || 1) })} />
              </div>
              <div>
                <Label className="text-xs">Points / submission</Label>
                <Input type="number" min={0} value={form.points_per_submission} onChange={(e) => setForm({ ...form, points_per_submission: Math.max(0, parseInt(e.target.value) || 0) })} />
              </div>
              <div>
                <Label className="text-xs">Completion bonus</Label>
                <Input type="number" min={0} value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Math.max(0, parseInt(e.target.value) || 0) })} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Each submission earns "Points / submission". Reaching 100% progress (one submission per day of the
              challenge) also awards the completion bonus.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createChallenge} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit proof */}
      <SubmitDialog
        challenge={submitFor}
        onClose={() => setSubmitFor(null)}
        onSubmitted={() => {
          setSubmitFor(null);
          loadData();
        }}
      />
    </div>
  );
}

function ChallengeCard({
  challenge,
  participation,
  submissions,
  expanded,
  onToggleExpand,
  joined,
  onJoin,
  onSubmit,
}: {
  challenge: Challenge;
  participation?: Participation;
  submissions: Submission[];
  expanded: boolean;
  onToggleExpand: () => void;
  joined: boolean;
  onJoin: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="card-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm">{challenge.title}</p>
            <p className="text-xs text-muted-foreground">
              {challenge.duration_days} days · {challenge.points_per_submission} pts/submission · {challenge.xp_reward} XP on completion
            </p>
            {challenge.description && <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {joined && <Badge className="bg-accent/10 text-accent">{participation?.progress_percent || 0}%</Badge>}
            {joined ? (
              <Button size="sm" onClick={onSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Submit
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onJoin}>Join</Button>
            )}
          </div>
        </div>

        {joined && <Progress value={participation?.progress_percent || 0} className="h-2 mt-3" />}

        {submissions.length > 0 && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-foreground"
          >
            {submissions.length} submission{submissions.length === 1 ? "" : "s"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {expanded && submissions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {submissions.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs rounded-md border border-border p-2 hover:bg-secondary/40"
              >
                {s.submission_type === "photo" ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <Link2 className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate flex-1">{s.note || s.url}</span>
                <span className="text-muted-foreground shrink-0">{new Date(s.created_at).toLocaleDateString()}</span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubmitDialog({
  challenge,
  onClose,
  onSubmitted,
}: {
  challenge: Challenge | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (challenge) {
      setMode("link");
      setUrl("");
      setNote("");
    }
  }, [challenge]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const { uploadUserFile } = await import("@/lib/cloud-storage");
      const result = await uploadUserFile(user.id, "content", file);
      setUrl(result.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user || !challenge || !url.trim()) {
      toast({ title: "Add a link or upload a file first", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const submissionType = mode === "upload" ? (url.match(/\.(jpe?g|png|gif|webp)$/i) ? "photo" : "file") : "link";

      const { error: subError } = await supabase.from("challenge_submissions" as any).insert({
        challenge_id: challenge.id,
        user_id: user.id,
        submission_type: submissionType,
        url: url.trim(),
        note: note.trim() || null,
      } as any);
      if (subError) throw subError;

      if (challenge.points_per_submission > 0) {
        await supabase.from("xp_transactions").insert({
          user_id: user.id,
          action: "challenge_submission",
          xp_amount: challenge.points_per_submission,
          description: `Submission for ${challenge.title}`,
        });
      }

      // Recompute progress from total submissions vs. duration, and award the
      // completion bonus exactly once when it first reaches 100%.
      const { count } = await supabase
        .from("challenge_submissions" as any)
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challenge.id)
        .eq("user_id", user.id);

      const progress = Math.min(100, Math.round(((count || 0) / Math.max(1, challenge.duration_days)) * 100));

      const { data: participation } = await supabase
        .from("challenge_participants")
        .select("*")
        .eq("challenge_id", challenge.id)
        .eq("user_id", user.id)
        .maybeSingle();

      const justCompleted = progress >= 100 && !participation?.is_completed;

      await supabase
        .from("challenge_participants")
        .update({
          progress_percent: progress,
          is_completed: progress >= 100,
          completed_at: justCompleted ? new Date().toISOString() : participation?.completed_at,
        })
        .eq("challenge_id", challenge.id)
        .eq("user_id", user.id);

      if (justCompleted && challenge.xp_reward > 0) {
        await supabase.from("xp_transactions").insert({
          user_id: user.id,
          action: "challenge_completed",
          xp_amount: challenge.xp_reward,
          description: `Completed ${challenge.title}`,
        });
      }

      toast({
        title: "Submitted!",
        description: justCompleted
          ? `Challenge complete — +${challenge.points_per_submission + challenge.xp_reward} XP total.`
          : `+${challenge.points_per_submission} XP added.`,
      });
      onSubmitted();
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!challenge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" /> Submit for {challenge?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "link" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => { setMode("link"); setUrl(""); }}
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> Paste a link
            </Button>
            <Button
              type="button"
              variant={mode === "upload" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => { setMode("upload"); setUrl(""); }}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload photo/file
            </Button>
          </div>

          {mode === "link" ? (
            <div>
              <Label className="text-xs">Link (reel, video, post — anything)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/reel/..." />
            </div>
          ) : url ? (
            <div className="rounded-lg border border-border p-2 text-xs flex items-center justify-between gap-2">
              <span className="truncate">{url}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setUrl("")}>Change</Button>
            </div>
          ) : uploading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </div>
          ) : (
            <label>
              <input
                type="file"
                accept="image/*,video/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Choose a photo or file
              </span>
            </label>
          )}

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Day 12 — posted at 7am" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || uploading || !url.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
