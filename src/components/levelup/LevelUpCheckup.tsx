import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface CheckupDef {
  id: string;
  name: string;
  frequency: string;
  due_date: string | null;
}

interface Submission {
  id: string;
  checkup_id: string;
  score: number | null;
  actions_total: number;
  actions_completed: number;
  submitted_at: string;
}

export function LevelUpCheckup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkups, setCheckups] = useState<CheckupDef[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("checkup_definitions").select("*").eq("is_active", true);
    setCheckups(c || []);
    const { data: s } = await supabase.from("checkup_submissions").select("*").eq("user_id", user.id);
    setSubmissions(s || []);
  };

  const startCheckup = async (checkupId: string) => {
    if (!user) return;
    await supabase.from("checkup_submissions").insert({ checkup_id: checkupId, user_id: user.id, score: 0 });
    loadData();
    toast({ title: "Checkup started" });
  };

  const getSubmissions = (cId: string) => submissions.filter((s) => s.checkup_id === cId);
  const hasSubmissions = submissions.length > 0;

  const filtered = checkups.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-bold">Checkup</h2>

      {/* Upcoming checkups banner */}
      {checkups.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">Upcoming Checkups</CardTitle></CardHeader>
          <CardContent className="flex gap-3 overflow-auto pb-3">
            {checkups.map((c) => (
              <Card key={c.id} className="min-w-[200px] bg-card">
                <CardContent className="pt-3 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <Badge variant="outline" className="text-[10px]">New</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] mr-1">{c.frequency.toUpperCase()}</Badge>
                    {c.due_date && (
                      <span className="text-destructive">
                        <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                        Overdue {format(new Date(c.due_date), "dd MMM")}
                      </span>
                    )}
                  </p>
                  <button onClick={() => startCheckup(c.id)} className="text-xs text-primary font-medium mt-2 hover:underline">
                    Start Checkup →
                  </button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state or table */}
      {!hasSubmissions ? (
        <Card className="card-shadow bg-primary/5">
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 mx-auto text-primary/50 mb-3" />
            <p className="font-bold text-lg">No Checkup Taken Yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              You haven't taken any checkups so far. When you complete your first one, your progress will appear here.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <Input placeholder="Search by checkup name" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {/* Checkup table */}
      <Card className="card-shadow overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Last Submission</TableHead>
              <TableHead>Total Submissions</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Actions Completed</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const subs = getSubmissions(c.id);
              const lastSub = subs.length > 0 ? subs[subs.length - 1] : null;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{c.frequency.toUpperCase()}</Badge></TableCell>
                  <TableCell>{lastSub ? format(new Date(lastSub.submitted_at), "MMM d, yyyy") : "–"}</TableCell>
                  <TableCell>{subs.length}</TableCell>
                  <TableCell>–</TableCell>
                  <TableCell className="text-primary font-medium">{lastSub ? `${lastSub.actions_completed}/${lastSub.actions_total}` : "0/0"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => startCheckup(c.id)}>
                      Start Checkup
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No checkups available</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
