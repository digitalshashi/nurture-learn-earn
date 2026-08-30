/**
 * Assignment responses.
 *
 * Every metric on this tab used to be a literal em dash, and "Export CSV" did
 * nothing. They are all derived from `assignment_submissions` here — and the
 * table opens into the submissions themselves, so a coach can read an answer
 * and grade it without leaving the page.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { datedFilename, downloadCsv } from "@/lib/csv";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  answer: string | null;
  score: number | null;
  status: string;
  submitted_at: string;
  graded_at: string | null;
}

interface Assignment {
  id: string;
  title: string;
  chapter_id: string;
  passing_score: number | null;
  max_retakes: number | null;
  assignment_submissions: Submission[];
  _chapterTitle: string;
}

interface Stat {
  submissions: number;
  learners: number;
  graded: number;
  avgScore: number | null;
  passRate: number | null;
  retakeRate: number;
  lastAt: string | null;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function statsFor(assignment: Assignment, subs: Submission[]): Stat {
  const learners = new Set(subs.map((s) => s.user_id));
  const scored = subs.filter((s) => s.score !== null && s.score !== undefined);
  const perLearner: Record<string, number> = {};
  subs.forEach((s) => {
    perLearner[s.user_id] = (perLearner[s.user_id] || 0) + 1;
  });
  const retakers = Object.values(perLearner).filter((n) => n > 1).length;

  const threshold = assignment.passing_score;
  const passRate =
    threshold === null || threshold === undefined || scored.length === 0
      ? null
      : scored.filter((s) => (s.score as number) >= threshold).length / scored.length;

  return {
    submissions: subs.length,
    learners: learners.size,
    graded: scored.length,
    avgScore: scored.length > 0 ? scored.reduce((a, s) => a + (s.score as number), 0) / scored.length : null,
    passRate,
    retakeRate: learners.size > 0 ? retakers / learners.size : 0,
    lastAt: subs.reduce<string | null>((latest, s) => (!latest || s.submitted_at > latest ? s.submitted_at : latest), null),
  };
}

export default function AssignmentsTab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrolled, setEnrolled] = useState(0);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [grading, setGrading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: secs }, { count: students }] = await Promise.all([
      supabase.from("sections").select("id, chapters(id, title)").eq("course_id", courseId),
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    ]);
    setEnrolled(students || 0);

    const chapterIds: string[] = [];
    const chapterTitles: Record<string, string> = {};
    (secs || []).forEach((s: any) =>
      (s.chapters || []).forEach((c: any) => {
        chapterIds.push(c.id);
        chapterTitles[c.id] = c.title;
      }),
    );

    if (chapterIds.length === 0) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("assignments")
      .select("*, assignment_submissions(*)")
      .in("chapter_id", chapterIds);

    const rows = (data || []).map((a: any) => ({
      ...a,
      assignment_submissions: (a.assignment_submissions || []) as Submission[],
      _chapterTitle: chapterTitles[a.chapter_id] || "—",
    })) as Assignment[];
    setAssignments(rows);

    const userIds = [...new Set(rows.flatMap((a) => a.assignment_submissions.map((s) => s.user_id)))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        map[p.id] = p.full_name || p.email || "Learner";
      });
      setNames(map);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Submissions inside the chosen window; everything on the page reads this. */
  const inWindow = useCallback(
    (subs: Submission[]) =>
      subs.filter((s) => {
        if (from && s.submitted_at < from) return false;
        // `to` is a date, so the comparison has to reach the end of that day.
        if (to && s.submitted_at > `${to}T23:59:59.999Z`) return false;
        return true;
      }),
    [from, to],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a._chapterTitle.toLowerCase().includes(q),
    );
  }, [assignments, search]);

  const overall = useMemo(() => {
    const all = assignments.flatMap((a) => inWindow(a.assignment_submissions));
    const submitters = new Set(all.map((s) => s.user_id));
    const scored = all.filter((s) => s.score !== null && s.score !== undefined);

    let passable = 0;
    let passed = 0;
    assignments.forEach((a) => {
      if (a.passing_score === null || a.passing_score === undefined) return;
      inWindow(a.assignment_submissions).forEach((s) => {
        if (s.score === null || s.score === undefined) return;
        passable += 1;
        if (s.score >= (a.passing_score as number)) passed += 1;
      });
    });

    const perPair: Record<string, number> = {};
    all.forEach((s) => {
      const key = `${s.assignment_id}:${s.user_id}`;
      perPair[key] = (perPair[key] || 0) + 1;
    });
    const pairs = Object.values(perPair);

    return {
      submissionRate: enrolled > 0 ? submitters.size / enrolled : null,
      avgScore: scored.length > 0 ? scored.reduce((a, s) => a + (s.score as number), 0) / scored.length : null,
      passRate: passable > 0 ? passed / passable : null,
      retakeRate: pairs.length > 0 ? pairs.filter((n) => n > 1).length / pairs.length : 0,
      dropOff: enrolled > 0 ? Math.max(0, 1 - submitters.size / enrolled) : null,
      total: all.length,
    };
  }, [assignments, enrolled, inWindow]);

  const grade = async (submission: Submission, score: number | null, status: string) => {
    setGrading(submission.id);
    try {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .update({ score, status, graded_at: new Date().toISOString() })
        .eq("id", submission.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("The grade was not saved — check your permissions.");
      toast({ title: "Graded", description: `${status}${score !== null ? ` · ${score}` : ""}` });
      await load();
    } catch (err: any) {
      toast({ title: "Could not grade", description: err.message, variant: "destructive" });
    } finally {
      setGrading(null);
    }
  };

  const exportCsv = () => {
    const rows = [["Assignment", "Lesson", "Learner", "Status", "Score", "Submitted", "Graded", "Answer"]];
    filtered.forEach((a) => {
      inWindow(a.assignment_submissions).forEach((s) => {
        rows.push([
          a.title,
          a._chapterTitle,
          names[s.user_id] || s.user_id,
          s.status,
          s.score === null || s.score === undefined ? "" : String(s.score),
          s.submitted_at,
          s.graded_at || "",
          (s.answer || "").replace(/\s+/g, " ").slice(0, 500),
        ]);
      });
    });

    if (rows.length === 1) {
      toast({ title: "Nothing to export", description: "No submissions in this range." });
      return;
    }

    downloadCsv(datedFilename("assignment-responses"), rows);
  };

  const metricCards = [
    {
      label: "Submission rate",
      value: overall.submissionRate === null ? "—" : pct(overall.submissionRate),
      hint: `${enrolled} enrolled`,
    },
    {
      label: "Average score",
      value: overall.avgScore === null ? "—" : overall.avgScore.toFixed(1),
      hint: "across graded submissions",
    },
    {
      label: "Passing",
      value: overall.passRate === null ? "—" : pct(overall.passRate),
      hint: "of graded, where a pass mark is set",
    },
    { label: "Retakes", value: pct(overall.retakeRate), hint: "learners who submitted more than once" },
    {
      label: "Drop-off before submission",
      value: overall.dropOff === null ? "—" : pct(overall.dropOff),
      hint: "enrolled but never submitted",
    },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Assignment responses</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {assignments.length} {assignments.length === 1 ? "assignment" : "assignments"} · {overall.total}{" "}
          submissions in range
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{m.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{m.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assignment or lesson"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-[150px]" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-[150px]" />
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Reload">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">
            {assignments.length === 0 ? "No assignments on this course" : "Nothing matches this search"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark a lesson as an assignment in the curriculum to collect responses.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Assignment</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Learners</TableHead>
                  <TableHead className="text-right">Avg. score</TableHead>
                  <TableHead className="text-right">Passing</TableHead>
                  <TableHead className="text-right">Retaking</TableHead>
                  <TableHead className="text-right">Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const subs = inWindow(a.assignment_submissions);
                  const s = statsFor(a, subs);
                  const open = expanded === a.id;
                  return [
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(open ? null : a.id)}
                    >
                      <TableCell>
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a._chapterTitle}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.submissions}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.learners}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.avgScore === null ? "—" : s.avgScore.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.passRate === null ? "—" : pct(s.passRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{pct(s.retakeRate)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {s.lastAt ? format(new Date(s.lastAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>,
                    open ? (
                      <TableRow key={`${a.id}-detail`} className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-secondary/30 p-4">
                          {subs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No submissions in this range.</p>
                          ) : (
                            <div className="space-y-2">
                              {subs
                                .slice()
                                .sort((x, y) => y.submitted_at.localeCompare(x.submitted_at))
                                .map((sub) => (
                                  <SubmissionRow
                                    key={sub.id}
                                    submission={sub}
                                    learner={names[sub.user_id] || "Learner"}
                                    passingScore={a.passing_score}
                                    busy={grading === sub.id}
                                    onGrade={(score, status) => grade(sub, score, status)}
                                  />
                                ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  learner,
  passingScore,
  busy,
  onGrade,
}: {
  submission: Submission;
  learner: string;
  passingScore: number | null;
  busy: boolean;
  onGrade: (score: number | null, status: string) => void;
}) {
  const [score, setScore] = useState(submission.score === null ? "" : String(submission.score));
  const passed =
    passingScore !== null && submission.score !== null && submission.score !== undefined
      ? submission.score >= passingScore
      : null;

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{learner}</p>
          <p className="text-[11px] text-muted-foreground">
            Submitted {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' HH:mm")}
            {submission.graded_at && ` · graded ${format(new Date(submission.graded_at), "MMM d")}`}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            passed === true && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            passed === false && "bg-destructive/15 text-destructive",
            passed === null && "bg-secondary text-muted-foreground",
          )}
        >
          {submission.status}
        </span>
      </div>

      {submission.answer && (
        <p className="mt-2 whitespace-pre-wrap rounded bg-secondary/50 p-2 text-sm leading-relaxed">
          {submission.answer}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Score"
          className="h-8 w-24 text-sm"
        />
        {passingScore !== null && (
          <span className="text-xs text-muted-foreground">pass mark {passingScore}</span>
        )}
        <Button
          size="sm"
          className="h-8"
          disabled={busy}
          onClick={() => {
            const parsed = score.trim() === "" ? null : Number(score);
            const status =
              parsed === null
                ? "submitted"
                : passingScore !== null && parsed < passingScore
                  ? "failed"
                  : "graded";
            onGrade(parsed, status);
          }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save grade"}
        </Button>
      </div>
    </div>
  );
}
