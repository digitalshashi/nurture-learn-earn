import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Check, Clock, AlertTriangle, Sparkles, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CrmFollowUps() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ lead_id: "", task: "", due_date: "", follow_up_type: "call" });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: f }, { data: l }] = await Promise.all([
      supabase.from("crm_follow_ups").select("*, crm_leads(name, email)").eq("coach_id", user!.id).order("due_date"),
      supabase.from("crm_leads").select("id, name").eq("coach_id", user!.id).order("name"),
    ]);
    setFollowUps(f || []);
    setLeads(l || []);
    setLoading(false);
  };

  const addFollowUp = async () => {
    if (!form.lead_id || !form.task || !form.due_date) { toast({ title: "Fill all required fields", variant: "destructive" }); return; }
    const { error } = await supabase.from("crm_follow_ups").insert({ ...form, coach_id: user!.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Follow-up created" });
    setForm({ lead_id: "", task: "", due_date: "", follow_up_type: "call" });
    setAddOpen(false);
    loadData();
  };

  const markComplete = async (id: string) => {
    await supabase.from("crm_follow_ups").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Marked as completed" });
    loadData();
  };

  const pending = followUps.filter(f => f.status === "pending");
  const completed = followUps.filter(f => f.status === "completed");
  const overdue = pending.filter(f => new Date(f.due_date) < new Date());

  const renderTable = (items: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lead</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No follow-ups</TableCell></TableRow>
        ) : items.map(f => (
          <TableRow key={f.id}>
            <TableCell className="text-sm font-medium">{f.crm_leads?.name || "—"}</TableCell>
            <TableCell className="text-sm">{f.task}</TableCell>
            <TableCell><Badge variant="secondary" className="text-xs">{f.follow_up_type}</Badge></TableCell>
            <TableCell className="text-sm">{new Date(f.due_date).toLocaleDateString()}</TableCell>
            <TableCell>
              <Badge variant={f.status === "completed" ? "default" : new Date(f.due_date) < new Date() ? "destructive" : "outline"} className="text-xs">
                {f.status === "completed" ? "Completed" : new Date(f.due_date) < new Date() ? "Overdue" : "Pending"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {f.status === "pending" && <Button variant="outline" size="sm" onClick={() => markComplete(f.id)}><Check className="h-3.5 w-3.5 mr-1" />Done</Button>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">Follow-Ups</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Follow-Up</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Follow-Up</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select Lead *" /></SelectTrigger>
                  <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Task *" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} />
                <Input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                <Select value={form.follow_up_type} onValueChange={v => setForm({ ...form, follow_up_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addFollowUp} className="w-full">Create Follow-Up</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="card-shadow"><CardContent className="pt-5 flex items-center gap-3"><Clock className="h-5 w-5 text-amber-500" /><div><p className="text-2xl font-bold">{pending.length}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-5 flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-2xl font-bold">{overdue.length}</p><p className="text-xs text-muted-foreground">Overdue</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-5 flex items-center gap-3"><Check className="h-5 w-5 text-green-500" /><div><p className="text-2xl font-bold">{completed.length}</p><p className="text-xs text-muted-foreground">Completed</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList><TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger><TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger></TabsList>
          <TabsContent value="pending"><Card className="card-shadow"><CardContent className="p-0">{renderTable(pending)}</CardContent></Card></TabsContent>
          <TabsContent value="completed"><Card className="card-shadow"><CardContent className="p-0">{renderTable(completed)}</CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
