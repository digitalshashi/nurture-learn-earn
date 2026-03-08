import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, User, Mail, Phone, MapPin, Tag, Calendar, MessageSquare, Sparkles, Loader2, TrendingUp, Target, Clock as ClockIcon, Lightbulb } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CrmLeadProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { if (user && id) loadData(); }, [user, id]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: l }, { data: n }, { data: f }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("crm_leads").select("*, crm_pipelines(name), crm_pipeline_stages(name, color)").eq("id", id!).single(),
      supabase.from("crm_lead_notes").select("*").eq("lead_id", id!).order("created_at", { ascending: false }),
      supabase.from("crm_follow_ups").select("*").eq("lead_id", id!).order("due_date"),
      supabase.from("crm_pipelines").select("*").eq("coach_id", user!.id),
      supabase.from("crm_pipeline_stages").select("*").order("sort_order"),
    ]);
    setLead(l);
    setEditForm(l || {});
    setNotes(n || []);
    setFollowUps(f || []);
    setPipelines(p || []);
    setStages(s || []);
    setLoading(false);
  };

  const saveLead = async () => {
    const { error } = await supabase.from("crm_leads").update({
      name: editForm.name, email: editForm.email, phone: editForm.phone, city: editForm.city,
      pipeline_id: editForm.pipeline_id, stage_id: editForm.stage_id, status: editForm.status,
      pipeline_value: editForm.pipeline_value, tags: editForm.tags,
      updated_at: new Date().toISOString(),
    }).eq("id", id!);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lead updated" });
    setEditing(false);
    loadData();
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    await supabase.from("crm_lead_notes").insert({ lead_id: id!, content: newNote, created_by: user!.id });
    setNewNote("");
    loadData();
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div></AppLayout>;
  if (!lead) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Lead not found</div></AppLayout>;

  const leadStages = stages.filter(s => s.pipeline_id === (editForm.pipeline_id || lead.pipeline_id));

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold font-display">{lead.name}</h1>
          <Badge variant={lead.status === "converted" ? "default" : lead.status === "lost" ? "destructive" : "outline"}>{lead.status}</Badge>
          <div className="ml-auto flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveLead}><Save className="h-4 w-4 mr-1" />Save</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Contact Info */}
          <div className="md:col-span-1 space-y-4">
            <Card className="card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editing ? (
                  <>
                    <Input placeholder="Name" value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    <Input placeholder="Email" value={editForm.email || ""} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    <Input placeholder="Phone" value={editForm.phone || ""} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    <Input placeholder="City" value={editForm.city || ""} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                    <Input placeholder="Pipeline Value" type="number" value={editForm.pipeline_value || 0} onChange={e => setEditForm({ ...editForm, pipeline_value: Number(e.target.value) })} />
                    <Select value={editForm.status || "open"} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" />{lead.name}</div>
                    <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{lead.email || "—"}</div>
                    <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{lead.phone || "—"}</div>
                    <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{lead.city || "—"}</div>
                    <div className="flex items-center gap-2 text-sm"><Tag className="h-4 w-4 text-muted-foreground" />{lead.source}</div>
                    {lead.pipeline_value > 0 && <p className="text-sm font-semibold text-accent">₹{Number(lead.pipeline_value).toLocaleString()}</p>}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {editing ? (
                  <>
                    <Select value={editForm.pipeline_id || ""} onValueChange={v => setEditForm({ ...editForm, pipeline_id: v, stage_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="Pipeline" /></SelectTrigger>
                      <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {leadStages.length > 0 && (
                      <Select value={editForm.stage_id || ""} onValueChange={v => setEditForm({ ...editForm, stage_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                        <SelectContent>{leadStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm">{lead.crm_pipelines?.name || "No pipeline"}</p>
                    {lead.crm_pipeline_stages && <Badge variant="outline" style={{ borderColor: lead.crm_pipeline_stages.color }}>{lead.crm_pipeline_stages.name}</Badge>}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {(lead.tags || []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
                  {(!lead.tags || lead.tags.length === 0) && <span className="text-xs text-muted-foreground">No tags</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Timeline & Notes */}
          <div className="md:col-span-2 space-y-4">
            <Card className="card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes & Activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Textarea placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)} className="min-h-[60px]" />
                  <Button onClick={addNote} disabled={!newNote.trim()} className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-3 mt-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                  ) : notes.map(n => (
                    <div key={n.id} className="border-l-2 border-accent/30 pl-3 py-1">
                      <p className="text-sm">{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Follow-Ups</CardTitle></CardHeader>
              <CardContent>
                {followUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No follow-ups scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {followUps.map(f => (
                      <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{f.task}</p>
                          <p className="text-xs text-muted-foreground">{new Date(f.due_date).toLocaleString()} · {f.follow_up_type}</p>
                        </div>
                        <Badge variant={f.status === "completed" ? "default" : "outline"} className="text-xs">{f.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /><span>Lead created</span><span className="text-xs text-muted-foreground ml-auto">{new Date(lead.created_at).toLocaleDateString()}</span></div>
                  {lead.converted_at && <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-green-500" /><span>Converted to customer</span><span className="text-xs text-muted-foreground ml-auto">{new Date(lead.converted_at).toLocaleDateString()}</span></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
