import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, MessageSquare, Search as SearchIcon } from "lucide-react";
import { format } from "date-fns";

export default function QnATab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => { loadQuestions(); }, [courseId]);

  const loadQuestions = async () => {
    const { data: secs } = await supabase.from("sections").select("id, chapters(id, title)").eq("course_id", courseId);
    const chapterIds: string[] = [];
    const chapterMap: Record<string, string> = {};
    secs?.forEach((s: any) => s.chapters.forEach((c: any) => {
      chapterIds.push(c.id);
      chapterMap[c.id] = c.title;
    }));

    if (chapterIds.length === 0) { setQuestions([]); return; }

    const { data } = await supabase
      .from("questions")
      .select("*, profiles:user_id(full_name)")
      .in("chapter_id", chapterIds)
      .order("created_at", { ascending: false });

    if (data) setQuestions(data.map((q: any) => ({ ...q, _chapterTitle: chapterMap[q.chapter_id] || "—" })));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions(questions.filter(q => q.id !== id));
    toast({ title: "Deleted" });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">QnAs</h2>
        <p className="text-sm text-muted-foreground">List of all the questions on your course</p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <SearchIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Manage all the questions across different chapters from here</p>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-[250px] truncate">{q.question}</TableCell>
                  <TableCell>{(q.profiles as any)?.full_name || "—"}</TableCell>
                  <TableCell>{q._chapterTitle}</TableCell>
                  <TableCell className="text-sm">{format(new Date(q.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MessageSquare className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(q.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
