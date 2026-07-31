import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Mail, MailOpen } from "lucide-react";
import { format } from "date-fns";

export default function CommentsTab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => { loadComments(); }, [courseId]);

  const loadComments = async () => {
    // Get all chapters for this course
    const { data: secs } = await supabase.from("sections").select("id, chapters(id, title)").eq("course_id", courseId);
    const chapterMap: Record<string, string> = {};
    const chapterIds: string[] = [];
    secs?.forEach((s: any) => s.chapters.forEach((c: any) => {
      chapterMap[c.id] = c.title;
      chapterIds.push(c.id);
    }));

    // For now, comments are on posts. We'll show chapter-related context.
    // Using the comments table which references posts
    const { data } = await supabase.from("comments").select("*, profiles:user_id(full_name, email)").order("created_at", { ascending: false });
    if (data) setComments(data.map((c: any) => ({ ...c, _chapterTitle: "—" })));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    setComments(comments.filter(c => c.id !== id));
    toast({ title: "Deleted", description: "Comment removed" });
  };

  const filtered = comments.filter(c => {
    if (search) {
      const name = (c.profiles as any)?.full_name?.toLowerCase() || "";
      const email = (c.profiles as any)?.email?.toLowerCase() || "";
      if (!name.includes(search.toLowerCase()) && !email.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Comments</h2>
        <p className="text-sm text-muted-foreground">List of all the comments on your Courses</p>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by User details" className="pl-9" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          Start date → End date
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === f ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm"><MailOpen className="h-3.5 w-3.5 mr-1" /> Mark as read</Button>
          <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5 mr-1" /> Mark as unread</Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comment</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No Data</TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-[200px] truncate">{c.content}</TableCell>
                  <TableCell>{(c.profiles as any)?.full_name || "—"}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{c._chapterTitle}</TableCell>
                  <TableCell className="text-sm">{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
