/**
 * Course reports.
 *
 * Two of the three sections here said "coming soon". They are built from the
 * same `chapter_progress` rows the course-completion section already used —
 * pivoted by chapter to show where people stall, and by learner to rank them.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { datedFilename, downloadCsv } from "@/lib/csv";
import { Download, Loader2, Search, Trophy, Users } from "lucide-react";
import { useTabParam } from "@/hooks/useTabParam";

interface ChapterRef {
  id: string;
  title: string;
  sectionTitle: string;
  order: number;
}

interface ProgressRow {
  chapter_id: string;
  user_id: string;
}

export default function ReportsTab({ courseId }: { courseId: string }) {
  // Section lives in the URL so links, refreshes and analytics all point
  // at the section actually being viewed.
  const [activeTab, setActiveTab] = useTabParam(["course", "chapter", "leaderboard"] as const, {
    param: "report",
  });
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [chapters, setChapters] = useState<ChapterRef[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [names, setNames] = useState<Record<string, { name: string; email: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: enr }, { data: secs }] = await Promise.all([
      supabase.from("enrollments").select("user_id, enrolled_at").eq("course_id", courseId),
      supabase.from("sections").select("id, title, sort_order, chapters(id, title, sort_order)").eq("course_id", courseId).order("sort_order"),
    ]);

    setEnrollments(enr || []);

    const flat: ChapterRef[] = [];
    (secs || [])
      .slice()
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .forEach((s: any) => {
        (s.chapters || [])
          .slice()
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .forEach((c: any) => {
            flat.push({ id: c.id, title: c.title, sectionTitle: s.title, order: flat.length + 1 });
          });
      });
    setChapters(flat);

    let rows: ProgressRow[] = [];
    if (flat.length > 0) {
      const { data: prog } = await supabase
        .from("chapter_progress")
        .select("chapter_id, user_id")
        .in(
          "chapter_id",
          flat.map((c) => c.id),
        )
        .eq("completed", true);
      rows = (prog || []) as ProgressRow[];
      setProgress(rows);
    } else {
      setProgress([]);
    }

    // Everyone who shows up in either list needs a name for the leaderboard.
    const userIds = [...new Set([...(enr || []).map((e: any) => e.user_id), ...rows.map((r) => r.user_id)])];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const map: Record<string, { name: string; email: string }> = {};
      (profiles || []).forEach((p: any) => {
        map[p.id] = { name: p.full_name || "Learner", email: p.email || "" };
      });
      setNames(map);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalChapters = chapters.length;

  /** Completed chapter count per learner — the basis of both new sections. */
  const perUser = useMemo(() => {
    const counts: Record<string, number> = {};
    progress.forEach((p) => {
      counts[p.user_id] = (counts[p.user_id] || 0) + 1;
    });
    return counts;
  }, [progress]);

  const perChapter = useMemo(() => {
    const counts: Record<string, number> = {};
    progress.forEach((p) => {
      counts[p.chapter_id] = (counts[p.chapter_id] || 0) + 1;
    });
    return counts;
  }, [progress]);

  const userPercents = useMemo(
    () =>
      Object.values(perUser).map((count) => (totalChapters > 0 ? Math.round((count / totalChapters) * 100) : 0)),
    [perUser, totalChapters],
  );

  const avgCompletion =
    userPercents.length > 0 ? Math.round(userPercents.reduce((a, b) => a + b, 0) / userPercents.length) : 0;

  const completionBuckets = [
    { label: "0% - 1%", min: 0, max: 1 },
    { label: "1% - 25%", min: 1, max: 25 },
    { label: "26% - 50%", min: 26, max: 50 },
    { label: "51% - 75%", min: 51, max: 75 },
    { label: "76% - 99%", min: 76, max: 99 },
    { label: "100%", min: 100, max: 100 },
  ];

  const leaderboard = useMemo(() => {
    // Enrolled learners with no progress still belong on the board — a zero
    // is a finding, and leaving them out makes a course look healthier than
    // it is.
    const ids = new Set<string>([...Object.keys(perUser), ...enrollments.map((e: any) => e.user_id)]);
    return [...ids]
      .map((id) => {
        const done = perUser[id] || 0;
        return {
          id,
          name: names[id]?.name || "Learner",
          email: names[id]?.email || "",
          completed: done,
          percent: totalChapters > 0 ? Math.round((done / totalChapters) * 100) : 0,
        };
      })
      .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
  }, [perUser, enrollments, names, totalChapters]);

  const visibleLeaderboard = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leaderboard;
    return leaderboard.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [leaderboard, search]);

  const exportLeaderboard = () => {
    downloadCsv(datedFilename("course-leaderboard"), [
      ["Rank", "Learner", "Email", "Lessons completed", "Total lessons", "Completion %"],
      ...leaderboard.map((r, i) => [i + 1, r.name, r.email, r.completed, totalChapters, r.percent]),
    ]);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-5 text-lg font-bold">Reports</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="course">Course completion</TabsTrigger>
          <TabsTrigger value="chapter">Chapter completion</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* ------------------------------- course ------------------------------- */}
        <TabsContent value="course" className="mt-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="mb-1 text-sm text-muted-foreground">Total enrolled</p>
                <p className="text-2xl font-bold tabular-nums">{enrollments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="mb-1 text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold tabular-nums">{userPercents.filter((p) => p === 100).length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="mb-1 text-sm text-muted-foreground">Average completion rate</p>
                <p className="text-2xl font-bold tabular-nums">{avgCompletion}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Percentage breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">How far through the course learners are</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Completion</TableHead>
                      <TableHead>Learners ({enrollments.length})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completionBuckets.map((bucket) => {
                      const count = userPercents.filter((p) => p >= bucket.min && p <= bucket.max).length;
                      const share = enrollments.length > 0 ? Math.round((count / enrollments.length) * 100) : 0;
                      return (
                        <TableRow key={bucket.label}>
                          <TableCell>{bucket.label}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {count} {count === 1 ? "learner" : "learners"} ({share}%)
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Average completion</CardTitle>
                <p className="text-sm text-muted-foreground">Share of lessons marked complete</p>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <div className="relative h-40 w-40">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="hsl(var(--accent))"
                      strokeWidth="10"
                      strokeDasharray={`${avgCompletion * 3.14} ${314 - avgCompletion * 3.14}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums">{avgCompletion}%</span>
                    <span className="text-xs text-muted-foreground">{enrollments.length} enrolled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------ chapters ------------------------------ */}
        <TabsContent value="chapter" className="mt-6">
          {chapters.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card py-14 text-center text-sm text-muted-foreground">
              Add lessons to the curriculum and their completion shows up here.
            </p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Where learners stall</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Completion per lesson, in course order. A sharp drop is where people leave.
                </p>
              </CardHeader>
              <CardContent className="space-y-1">
                {chapters.map((ch, idx) => {
                  const done = perChapter[ch.id] || 0;
                  const share = enrollments.length > 0 ? Math.round((done / enrollments.length) * 100) : 0;
                  const previous = idx > 0 ? perChapter[chapters[idx - 1].id] || 0 : done;
                  // A lesson finished by far fewer people than the one before it
                  // is the interesting row, so it gets called out.
                  const dropOff = idx > 0 && previous > 0 && done / previous < 0.6;
                  return (
                    <div
                      key={ch.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2",
                        dropOff && "bg-destructive/5",
                      )}
                    >
                      <span className="w-7 shrink-0 text-xs font-mono text-muted-foreground">
                        {String(ch.order).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ch.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{ch.sectionTitle}</p>
                      </div>
                      <div className="hidden w-40 shrink-0 sm:block">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", dropOff ? "bg-destructive" : "bg-accent")}
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {done} · {share}%
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ----------------------------- leaderboard ---------------------------- */}
        <TabsContent value="leaderboard" className="mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a learner"
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportLeaderboard} disabled={leaderboard.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
          </div>

          {visibleLeaderboard.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card py-14 text-center text-sm text-muted-foreground">
              {leaderboard.length === 0 ? "Nobody is enrolled yet." : "No learner matches that search."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Learner</TableHead>
                    <TableHead className="text-right">Lessons done</TableHead>
                    <TableHead className="w-[220px]">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLeaderboard.map((row) => {
                    const rank = leaderboard.indexOf(row) + 1;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                              rank === 1 && "bg-amber-400/20 text-amber-600 dark:text-amber-400",
                              rank === 2 && "bg-zinc-400/20 text-zinc-600 dark:text-zinc-300",
                              rank === 3 && "bg-orange-500/15 text-orange-600 dark:text-orange-400",
                              rank > 3 && "text-muted-foreground",
                            )}
                          >
                            {rank <= 3 ? <Trophy className="h-3.5 w-3.5" /> : rank}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{row.name}</p>
                          {row.email && <p className="text-[11px] text-muted-foreground">{row.email}</p>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.completed} / {totalChapters}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${row.percent}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-semibold tabular-nums">
                              {row.percent}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
