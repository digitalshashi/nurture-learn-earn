import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, MessageCircle, CheckCircle, XCircle, Search } from "lucide-react";
import { format } from "date-fns";

export default function ChatbotTab({ courseId }: { courseId: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => { loadData(); }, [courseId]);

  const loadData = async () => {
    const { data } = await supabase
      .from("chatbot_questions")
      .select("*, profiles:user_id(full_name)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    if (data) setQuestions(data);
  };

  const totalUsers = new Set(questions.map(q => q.user_id)).size;
  const satisfied = questions.filter(q => q.is_satisfied === true).length;
  const unsatisfied = questions.filter(q => q.is_satisfied === false).length;
  const rated = satisfied + unsatisfied;
  const satRate = rated > 0 ? Math.round((satisfied / rated) * 100) : 0;

  const filtered = questions.filter(q => {
    if (search) {
      const name = (q.profiles as any)?.full_name?.toLowerCase() || "";
      const qText = q.question?.toLowerCase() || "";
      if (!name.includes(search.toLowerCase()) && !qText.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">ChatBot Analytics</h2>
        <p className="text-sm text-muted-foreground">Monitor your chatbot performance and user interactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Users</p><div className="flex items-center gap-2 mt-1"><Users className="h-5 w-5 text-muted-foreground" /><span className="text-xl font-bold">{totalUsers}</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Questions</p><div className="flex items-center gap-2 mt-1"><MessageCircle className="h-5 w-5 text-success" /><span className="text-xl font-bold text-success">{questions.length}</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Satisfied Conversations</p><div className="flex items-center gap-2 mt-1"><CheckCircle className="h-5 w-5 text-success" /><span className="text-xl font-bold">{satisfied} / {rated}</span></div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Satisfaction Rate</p><p className="text-xl font-bold mt-1">{satRate}%</p></CardContent></Card>
      </div>
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Unsatisfied Conversations</p><div className="flex items-center gap-2 mt-1"><XCircle className="h-5 w-5 text-destructive" /><span className="text-xl font-bold text-destructive">{unsatisfied}</span></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">Start Date → End Date</div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Questions</SelectItem>
            <SelectItem value="satisfied">Satisfied</SelectItem>
            <SelectItem value="unsatisfied">Unsatisfied</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions or users..." className="pl-9" />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Chat Questions ({filtered.length})</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscriber</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Bot Answer</TableHead>
              <TableHead>Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No Data</TableCell>
              </TableRow>
            ) : (
              filtered.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{(q.profiles as any)?.full_name || "—"}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{q.question}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{q.bot_answer || "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(q.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
