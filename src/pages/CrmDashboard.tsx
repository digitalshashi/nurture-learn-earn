import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Users, UserPlus, DollarSign, TrendingUp, Plus, Search, Eye, Edit2, Trash2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function CrmDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPipeline, setFilterPipeline] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "manual", pipeline_id: "", stage_id: "", notes: "", tags: "" });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }, { data: l }] = await Promise.all([
      supabase.from("crm_pipelines").select("*").eq("coach_id", user!.id),
      supabase.from("crm_pipeline_stages").select("*").order("sort_order"),
      supabase.from("crm_leads").select("*, crm_pipelines(name), crm_pipeline_stages(name, color)").eq("coach_id", user!.id).order("created_at", { ascending: false }),
    ]);
    setPipelines(p || []);
    setStages(s || []);
    setLeads(l || []);
    setLoading(false);
  };

  const addLead = async () => {
    if (!newLead.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const { error } = await supabase.from("crm_leads").insert({
      name: newLead.name, email: newLead.email || null, phone: newLead.phone || null,
      source: newLead.source, pipeline_id: newLead.pipeline_id || null, stage_id: newLead.stage_id || null,
      coach_id: user!.id, tags: newLead.tags ? newLead.tags.split(",").map(t => t.trim()) : [],
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (newLead.notes) {
      const { data: lead } = await supabase.from("crm_leads").select("id").eq("coach_id", user!.id).order("created_at", { ascending: false }).limit(1).single();
      if (lead) await supabase.from("crm_lead_notes").insert({ lead_id: lead.id, content: newLead.notes, created_by: user!.id });
    }
    toast({ title: "Lead added" });
    setNewLead({ name: "", email: "", phone: "", source: "manual", pipeline_id: "", stage_id: "", notes: "", tags: "" });
    setAddOpen(false);
    loadData();
  };

  const deleteLead = async (id: string) => {
    await supabase.from("crm_leads").delete().eq("id", id);
    toast({ title: "Lead deleted" });
    loadData();
  };

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === "open").length;
  const converted = leads.filter(l => l.status === "converted").length;
  const pipelineValue = leads.reduce((s, l) => s + (Number(l.pipeline_value) || 0), 0);

  const filtered = leads.filter(l => {
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPipeline !== "all" && l.pipeline_id !== filterPipeline) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  const stagesForPipeline = stages.filter(s => s.pipeline_id === newLead.pipeline_id);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">CRM Dashboard</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name *" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} />
                <Input placeholder="Email" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                <Input placeholder="Phone" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} />
                <Select value={newLead.source} onValueChange={v => setNewLead({ ...newLead, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="meta_ads">Meta Ads</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                  </SelectContent>
                </Select>
                {pipelines.length > 0 && (
                  <Select value={newLead.pipeline_id} onValueChange={v => setNewLead({ ...newLead, pipeline_id: v, stage_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select Pipeline" /></SelectTrigger>
                    <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {stagesForPipeline.length > 0 && (
                  <Select value={newLead.stage_id} onValueChange={v => setNewLead({ ...newLead, stage_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Stage" /></SelectTrigger>
                    <SelectContent>{stagesForPipeline.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Input placeholder="Tags (comma separated)" value={newLead.tags} onChange={e => setNewLead({ ...newLead, tags: e.target.value })} />
                <Textarea placeholder="Notes" value={newLead.notes} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} />
                <Button onClick={addLead} className="w-full">Save Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-shadow"><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalLeads}</p><p className="text-xs text-muted-foreground">Total Leads</p></div></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><UserPlus className="h-5 w-5 text-accent" /></div><div><p className="text-2xl font-bold">{newLeads}</p><p className="text-xs text-muted-foreground">New Leads</p></div></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{converted}</p><p className="text-xs text-muted-foreground">Converted</p></div></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><DollarSign className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">₹{pipelineValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pipeline Value</p></div></div></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterPipeline} onValueChange={setFilterPipeline}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pipeline" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipelines</SelectItem>
              {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leads found. Add your first lead!</TableCell></TableRow>
                ) : filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">{l.name}</TableCell>
                    <TableCell className="text-sm"><div>{l.email}</div><div className="text-muted-foreground text-xs">{l.phone}</div></TableCell>
                    <TableCell className="text-sm">{l.crm_pipelines?.name || "—"}</TableCell>
                    <TableCell>
                      {l.crm_pipeline_stages ? (
                        <Badge variant="outline" style={{ borderColor: l.crm_pipeline_stages.color, color: l.crm_pipeline_stages.color }}>{l.crm_pipeline_stages.name}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{l.source}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={l.status === "converted" ? "default" : l.status === "lost" ? "destructive" : "outline"} className="text-xs">{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/crm/leads/${l.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLead(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
