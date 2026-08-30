/**
 * QnA — the questions learners asked on a lesson.
 *
 * The table used to be read-only with a reply button that did nothing, so the
 * only thing a coach could do with a question was delete it. Answering writes
 * `answer`/`answered_at`/`answered_by` and resolves the thread, which is what
 * the player reads back to the learner.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MessageSquare,
  RotateCcw,
  Search as SearchIcon,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface Question {
  id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  is_resolved: boolean;
  created_at: string;
  chapter_id: string;
  user_id: string;
  profiles?: { full_name?: string | null } | null;
  _chapterTitle: string;
}

type Filter = "all" | "unanswered" | "answered";

interface Props {
  courseId: string;
  /** Lets the editor shell refresh its "unanswered" badge. */
  onChanged?: () => void;
}

export default function QnATab({ courseId, onChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: secs } = await supabase
      .from("sections")
      .select("id, chapters(id, title)")
      .eq("course_id", courseId);

    const chapterIds: string[] = [];
    const chapterTitles: Record<string, string> = {};
    (secs || []).forEach((s: any) =>
      (s.chapters || []).forEach((c: any) => {
        chapterIds.push(c.id);
        chapterTitles[c.id] = c.title;
      }),
    );

    if (chapterIds.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("questions")
      .select("*, profiles:user_id(full_name)")
      .in("chapter_id", chapterIds)
      .order("created_at", { ascending: false });

    setQuestions(
      (data || []).map((q: any) => ({ ...q, _chapterTitle: chapterTitles[q.chapter_id] || "—" })),
    );
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitAnswer = async (question: Question) => {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .update({
          answer: text,
          answered_at: new Date().toISOString(),
          answered_by: user?.id ?? null,
          is_resolved: true,
        })
        .eq("id", question.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("The answer was not saved — you may not have permission to answer on this course.");
      }
      toast({ title: "Answer posted", description: "The learner sees it on the lesson." });
      setReplyingTo(null);
      setDraft("");
      await load();
      onChanged?.();
    } catch (err: any) {
      toast({ title: "Could not post", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const reopen = async (question: Question) => {
    const { error } = await supabase
      .from("questions")
      .update({ is_resolved: false })
      .eq("id", question.id);
    if (error) {
      toast({ title: "Could not reopen", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    onChanged?.();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast({ title: "Question deleted" });
    onChanged?.();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((row) => {
      if (filter === "answered" && !row.answer) return false;
      if (filter === "unanswered" && row.answer) return false;
      if (!q) return true;
      return (
        row.question.toLowerCase().includes(q) ||
        (row.answer || "").toLowerCase().includes(q) ||
        (row.profiles?.full_name || "").toLowerCase().includes(q) ||
        row._chapterTitle.toLowerCase().includes(q)
      );
    });
  }, [questions, search, filter]);

  const unanswered = questions.filter((q) => !q.answer).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Questions</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {questions.length} asked · {unanswered} waiting on you
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, learners or lessons"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              { key: "all", label: `All (${questions.length})` },
              { key: "unanswered", label: `Unanswered (${unanswered})` },
              { key: "answered", label: `Answered (${questions.length - unanswered})` },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === chip.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">
            {questions.length === 0 ? "No questions yet" : "Nothing matches this filter"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions learners ask on a lesson land here for you to answer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const replying = replyingTo === q.id;
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {q.profiles?.full_name || "A learner"} · {q._chapterTitle} ·{" "}
                      {format(new Date(q.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      q.answer
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {q.answer ? "Answered" : "Waiting"}
                  </span>
                </div>

                {q.answer && !replying && (
                  <div className="mt-3 rounded-lg border-l-2 border-accent bg-secondary/40 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                      <CheckCircle2 className="h-3 w-3" /> Your answer
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{q.answer}</p>
                    {q.answered_at && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {format(new Date(q.answered_at), "MMM d, yyyy 'at' HH:mm")}
                      </p>
                    )}
                  </div>
                )}

                {replying && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write your answer…"
                      className="min-h-[90px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy || !draft.trim()} onClick={() => submitAnswer(q)}>
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                        Post answer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setReplyingTo(null);
                          setDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {!replying && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={q.answer ? "outline" : "default"}
                      onClick={() => {
                        setReplyingTo(q.id);
                        setDraft(q.answer || "");
                      }}
                    >
                      <MessageSquare className="mr-1 h-3.5 w-3.5" />
                      {q.answer ? "Edit answer" : "Answer"}
                    </Button>
                    {q.is_resolved && (
                      <Button size="sm" variant="ghost" onClick={() => reopen(q)}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(q.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
