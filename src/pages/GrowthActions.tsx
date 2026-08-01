import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CheckSquare, Plus, Trash2, Trophy } from "lucide-react";

const CATEGORIES = ["general", "sales", "ads", "content", "ops"];

export default function GrowthActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newAction, setNewAction] = useState({ title: "", category: "general", points: "10", due_date: "" });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const weekStart = getWeekStart();
    const [{ data: a }, { data: t }, { data: lb }] = await Promise.all([
      supabase.from("actions" as any).select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("action_templates" as any).select("*").order("created_at"),
      supabase.from("leaderboard_points" as any).select("*").eq("week_start", weekStart).order("total_points", { ascending: false }).limit(20),
    ]);
    setActions((a as any[]) || []);
    setTemplates((t as any[]) || []);
    setLeaderboard((lb as any[]) || []);
    setLoading(false);
  };

  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

  const createAction = async () => {
    if (!newAction.title) return;
    const { error } = await supabase.from("actions" as any).insert({
      user_id: user!.id,
      title: newAction.title,
      category: newAction.category,
      points: Number(newAction.points) || 10,
      due_date: newAction.due_date || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Action added" });
    setNewAction({ title: "", category: "general", points: "10", due_date: "" });
    setAddOpen(false);
    loadData();
  };

  const addFromTemplate = async (tpl: any) => {
    const { error } = await supabase.from("actions" as any).insert({
      user_id: user!.id,
      title: tpl.title,
      category: tpl.category,
      points: tpl.points,
      due_date: new Date().toISOString().slice(0, 10),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Action added from template" });
    loadData();
  };

  const toggleDone = async (action: any) => {
    const done = action.status !== "done";
    const { error } = await supabase.from("actions" as any).update({
      status: done ? "done" : "pending",
      completed_at: done ? new Date().toISOString() : null,
    }).eq("id", action.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (done) {
      const weekStart = getWeekStart();
      const { data: existing } = await supabase.from("leaderboard_points" as any)
        .select("*").eq("user_id", user!.id).eq("week_start", weekStart).maybeSingle();
      const newTotal = ((existing as any)?.total_points || 0) + action.points;
      const { error: pointsError } = await supabase.from("leaderboard_points" as any).upsert({
        user_id: user!.id, week_start: weekStart, total_points: newTotal, updated_at: new Date().toISOString(),
      });
      if (pointsError) toast({ title: "Points not recorded", description: pointsError.message, variant: "destructive" });
    }
    loadData();
  };

  const deleteAction = async (id: string) => {
    await supabase.from("actions" as any).delete().eq("id", id);
    loadData();
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayActions = actions.filter(a => a.due_date === today || !a.due_date);
  const weekActions = actions.filter(a => a.due_date && a.due_date >= getWeekStart());

  const renderList = (list: any[]) => (
    list.length === 0 ? (
      <p className="text-sm text-muted-foreground py-6 text-center">No actions here yet.</p>
    ) : (
      <div className="space-y-2">
        {list.map(a => (
          <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <Checkbox checked={a.status === "done"} onCheckedChange={() => toggleDone(a)} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                <span className="text-xs text-muted-foreground">+{a.points} pts</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAction(a.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    )
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold font-display">Actions</h1>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Action</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Action</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Action title" value={newAction.title} onChange={e => setNewAction({ ...newAction, title: e.target.value })} />
                <Select value={newAction.category} onValueChange={v => setNewAction({ ...newAction, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Points" value={newAction.points} onChange={e => setNewAction({ ...newAction, points: e.target.value })} />
                <Input type="date" value={newAction.due_date} onChange={e => setNewAction({ ...newAction, due_date: e.target.value })} />
                <Button onClick={createAction} className="w-full">Add Action</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>
            <TabsContent value="today"><Card className="card-shadow mt-4"><CardContent className="pt-4">{renderList(todayActions)}</CardContent></Card></TabsContent>
            <TabsContent value="week"><Card className="card-shadow mt-4"><CardContent className="pt-4">{renderList(weekActions)}</CardContent></Card></TabsContent>
            <TabsContent value="all"><Card className="card-shadow mt-4"><CardContent className="pt-4">{renderList(actions)}</CardContent></Card></TabsContent>
            <TabsContent value="templates">
              <Card className="card-shadow mt-4">
                <CardContent className="pt-4 space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                          <span className="text-xs text-muted-foreground">+{t.points} pts · {t.recommended_frequency}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addFromTemplate(t)}>Add</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="leaderboard">
              <Card className="card-shadow mt-4">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> This week</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No points logged yet this week.</p>
                  ) : leaderboard.map((row, i) => (
                    <div key={row.user_id} className="flex items-center justify-between p-2.5 rounded-lg border">
                      <span className="text-sm">#{i + 1} {row.user_id === user!.id ? "You" : row.user_id.slice(0, 8)}</span>
                      <span className="text-sm font-semibold">{row.total_points} pts</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
