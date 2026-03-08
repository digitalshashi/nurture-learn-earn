import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Plus, GripVertical, Settings, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CrmPipelines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [addPipelineOpen, setAddPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStages, setNewStages] = useState([
    { name: "New Lead", color: "#6366f1" },
    { name: "Contacted", color: "#f59e0b" },
    { name: "Qualified", color: "#3b82f6" },
    { name: "Won", color: "#22c55e" },
    { name: "Lost", color: "#ef4444" },
  ]);
  const [dragLead, setDragLead] = useState<string | null>(null);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }, { data: l }] = await Promise.all([
      supabase.from("crm_pipelines").select("*").eq("coach_id", user!.id).order("created_at"),
      supabase.from("crm_pipeline_stages").select("*").order("sort_order"),
      supabase.from("crm_leads").select("*, crm_pipeline_stages(name, color)").eq("coach_id", user!.id),
    ]);
    setPipelines(p || []);
    setStages(s || []);
    setLeads(l || []);
    if (p && p.length > 0 && !selectedPipeline) setSelectedPipeline(p[0].id);
    setLoading(false);
  };

  const createPipeline = async () => {
    if (!newPipelineName.trim()) return;
    const { data: pipeline, error } = await supabase.from("crm_pipelines").insert({ name: newPipelineName, coach_id: user!.id }).select().single();
    if (error || !pipeline) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
    const stageInserts = newStages.map((s, i) => ({ pipeline_id: pipeline.id, name: s.name, color: s.color, sort_order: i }));
    await supabase.from("crm_pipeline_stages").insert(stageInserts);
    toast({ title: "Pipeline created" });
    setNewPipelineName("");
    setAddPipelineOpen(false);
    loadData();
    setSelectedPipeline(pipeline.id);
  };

  const deletePipeline = async (id: string) => {
    await supabase.from("crm_pipelines").delete().eq("id", id);
    toast({ title: "Pipeline deleted" });
    setSelectedPipeline("");
    loadData();
  };

  const moveLeadToStage = async (leadId: string, stageId: string) => {
    await supabase.from("crm_leads").update({ stage_id: stageId, updated_at: new Date().toISOString() }).eq("id", leadId);
    loadData();
  };

  const pipelineStages = stages.filter(s => s.pipeline_id === selectedPipeline);
  const pipelineLeads = leads.filter(l => l.pipeline_id === selectedPipeline);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">Pipelines</h1>
          <div className="flex items-center gap-2">
            {pipelines.length > 0 && (
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Pipeline" /></SelectTrigger>
                <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Dialog open={addPipelineOpen} onOpenChange={setAddPipelineOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Pipeline</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Pipeline</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Pipeline Name" value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} />
                  <div>
                    <p className="text-sm font-medium mb-2">Stages</p>
                    {newStages.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="color" value={s.color} onChange={e => { const u = [...newStages]; u[i].color = e.target.value; setNewStages(u); }} className="w-8 h-8 rounded cursor-pointer" />
                        <Input value={s.name} onChange={e => { const u = [...newStages]; u[i].name = e.target.value; setNewStages(u); }} className="flex-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNewStages(newStages.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setNewStages([...newStages, { name: "", color: "#94a3b8" }])}><Plus className="h-3 w-3 mr-1" />Add Stage</Button>
                  </div>
                  <Button onClick={createPipeline} className="w-full">Create Pipeline</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : pipelines.length === 0 ? (
          <Card className="card-shadow"><CardContent className="py-12 text-center text-muted-foreground">No pipelines yet. Create your first pipeline to start managing leads!</CardContent></Card>
        ) : (
          /* Kanban Board */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pipelineStages.map(stage => {
              const stageLeads = pipelineLeads.filter(l => l.stage_id === stage.id);
              return (
                <div
                  key={stage.id}
                  className="min-w-[260px] max-w-[280px] flex-shrink-0"
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragLead) { moveLeadToStage(dragLead, stage.id); setDragLead(null); } }}
                >
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-semibold">{stage.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{stageLeads.length}</Badge>
                    </div>
                    <div className="space-y-2 min-h-[60px]">
                      {stageLeads.map(lead => (
                        <Card
                          key={lead.id}
                          className="cursor-grab active:cursor-grabbing card-shadow"
                          draggable
                          onDragStart={() => setDragLead(lead.id)}
                        >
                          <CardContent className="p-3">
                            <p className="text-sm font-medium">{lead.name}</p>
                            {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                            {lead.pipeline_value > 0 && <p className="text-xs font-semibold text-accent mt-1">₹{Number(lead.pipeline_value).toLocaleString()}</p>}
                            <div className="flex items-center gap-1 mt-2">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/crm/leads/${lead.id}`)}><Eye className="h-3 w-3" /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPipeline && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => deletePipeline(selectedPipeline)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete Pipeline
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
