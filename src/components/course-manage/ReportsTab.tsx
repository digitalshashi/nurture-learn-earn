import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

export default function ReportsTab({ courseId }: { courseId: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    const { data: enr } = await supabase.from("enrollments").select("*, profiles:user_id(full_name, email)").eq("course_id", courseId);
    if (enr) setEnrollments(enr);

    const { data: secs } = await supabase.from("sections").select("id, chapters(id)").eq("course_id", courseId);
    const chapterIds = secs?.flatMap((s: any) => s.chapters.map((c: any) => c.id)) || [];
    setTotalChapters(chapterIds.length);

    if (chapterIds.length > 0) {
      const { data: prog } = await supabase.from("chapter_progress").select("*").in("chapter_id", chapterIds).eq("completed", true);
      if (prog) setProgress(prog);
    }
  };

  const completionBuckets = [
    { label: "0% - 1%", min: 0, max: 1 },
    { label: "1% - 25%", min: 1, max: 25 },
    { label: "26% - 50%", min: 26, max: 50 },
    { label: "51% - 75%", min: 51, max: 75 },
    { label: "76% - 99%", min: 76, max: 99 },
    { label: "100%", min: 100, max: 100 },
  ];

  // Calculate per-user completion %
  const userCompletions: Record<string, number> = {};
  if (totalChapters > 0) {
    progress.forEach((p) => {
      userCompletions[p.user_id] = (userCompletions[p.user_id] || 0) + 1;
    });
  }
  const userPercents = Object.values(userCompletions).map((count) => 
    totalChapters > 0 ? Math.round((count / totalChapters) * 100) : 0
  );
  const avgCompletion = userPercents.length > 0 ? Math.round(userPercents.reduce((a, b) => a + b, 0) / userPercents.length) : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Reports</h2>

      <Tabs defaultValue="course">
        <TabsList>
          <TabsTrigger value="course">Course Completion</TabsTrigger>
          <TabsTrigger value="chapter">Chapter Completion</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="course" className="mt-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Total Enrolled</p>
                <p className="text-2xl font-bold">{enrollments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold">{userPercents.filter(p => p === 100).length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Average Completion Rate</p>
                <p className="text-2xl font-bold">{avgCompletion}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-[1fr_300px] gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Percentage Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">Percentage of completion by users</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Percentage of Completion</TableHead>
                      <TableHead>All Users ({enrollments.length})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completionBuckets.map((bucket) => {
                      const count = userPercents.filter(p => p >= bucket.min && p <= bucket.max).length;
                      const pct = enrollments.length > 0 ? Math.round((count / enrollments.length) * 100) : 0;
                      return (
                        <TableRow key={bucket.label}>
                          <TableCell>{bucket.label}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {count} user ({pct}%)
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
                <CardTitle className="text-base">Average Completion Rate</CardTitle>
                <p className="text-sm text-muted-foreground">Percentage of chapters marked as completed</p>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--accent))" strokeWidth="10"
                      strokeDasharray={`${avgCompletion * 3.14} ${314 - avgCompletion * 3.14}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{avgCompletion}%</span>
                    <span className="text-xs text-muted-foreground">No of Users: {enrollments.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chapter" className="mt-6">
          <p className="text-sm text-muted-foreground">Chapter-level completion analytics coming soon.</p>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <p className="text-sm text-muted-foreground">Leaderboard coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
