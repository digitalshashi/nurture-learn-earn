import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, Download } from "lucide-react";

export default function AssignmentsTab({ courseId }: { courseId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { loadAssignments(); }, [courseId]);

  const loadAssignments = async () => {
    const { data: secs } = await supabase.from("sections").select("id, chapters(id, title)").eq("course_id", courseId);
    const chapterIds: string[] = [];
    secs?.forEach((s: any) => s.chapters.forEach((c: any) => chapterIds.push(c.id)));

    if (chapterIds.length === 0) { setAssignments([]); return; }

    const { data } = await supabase.from("assignments").select("*, assignment_submissions(*)").in("chapter_id", chapterIds);
    if (data) setAssignments(data);
  };

  const metrics = {
    submissionRate: "—",
    avgScore: "—",
    passingPct: "—",
    retakePct: "—",
    dropOff: "—",
  };

  const filtered = assignments.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Assignment Responses</h2>
          <p className="text-sm text-muted-foreground">Track learner submissions and performance across all course assignments.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Start date → End date
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Submission Rate ⓘ</p><p className="text-xl font-bold mt-1">{metrics.submissionRate}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Average Score ⓘ</p><p className="text-xl font-bold mt-1">{metrics.avgScore}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Passing % ⓘ</p><p className="text-xl font-bold mt-1">{metrics.passingPct}</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Retake % ⓘ</p><p className="text-xl font-bold mt-1">{metrics.retakePct}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Drop-off Rate before Submission ⓘ</p><p className="text-xl font-bold mt-1">{metrics.dropOff}</p></CardContent></Card>
      </div>

      {/* Search + Export */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by assignment title" className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={loadAssignments}><RefreshCw className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Drop-off Rate</TableHead>
              <TableHead>Avg. Score</TableHead>
              <TableHead>Passing %</TableHead>
              <TableHead>Retaking %</TableHead>
              <TableHead>Avg. Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No assignments found</TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.assignment_submissions?.length || 0}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
