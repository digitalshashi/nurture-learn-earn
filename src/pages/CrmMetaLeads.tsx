import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Webhook, TestTube, Facebook, ArrowRight, Copy, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CrmMetaLeads() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ page_name: "", page_id: "", default_pipeline_id: "", default_stage_id: "" });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("crm_meta_lead_config").select("*, crm_pipelines(name), crm_pipeline_stages(name)").eq("coach_id", user!.id),
      supabase.from("crm_pipelines").select("*").eq("coach_id", user!.id),
      supabase.from("crm_pipeline_stages").select("*").order("sort_order"),
    ]);
    setConfigs(c || []);
    setPipelines(p || []);
    setStages(s || []);
    setLoading(false);
  };

  const createConfig = async () => {
    if (!form.page_name) return;
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-lead-webhook`;
    const { error } = await supabase.from("crm_meta_lead_config").insert({
      coach_id: user!.id, page_name: form.page_name, page_id: form.page_id || null,
      webhook_url: webhookUrl, default_pipeline_id: form.default_pipeline_id || null,
      default_stage_id: form.default_stage_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Meta Lead config created" });
    setForm({ page_name: "", page_id: "", default_pipeline_id: "", default_stage_id: "" });
    setAddOpen(false);
    loadData();
  };

  const toggleConfig = async (id: string, active: boolean) => {
    await supabase.from("crm_meta_lead_config").update({ is_active: active }).eq("id", id);
    loadData();
  };

  const deleteConfig = async (id: string) => {
    await supabase.from("crm_meta_lead_config").delete().eq("id", id);
    toast({ title: "Config deleted" });
    loadData();
  };

  const copyWebhook = (url: string) => {
    navigator.clipboard.writeText(url || "");
    toast({ title: "Webhook URL copied" });
  };

  const stagesForPipeline = stages.filter(s => s.pipeline_id === form.default_pipeline_id);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">Meta Lead Ads</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Connect Page</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connect Facebook Page</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Facebook Page Name *" value={form.page_name} onChange={e => setForm({ ...form, page_name: e.target.value })} />
                <Input placeholder="Page ID (optional)" value={form.page_id} onChange={e => setForm({ ...form, page_id: e.target.value })} />
                {pipelines.length > 0 && (
                  <Select value={form.default_pipeline_id} onValueChange={v => setForm({ ...form, default_pipeline_id: v, default_stage_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Default Pipeline" /></SelectTrigger>
                    <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {stagesForPipeline.length > 0 && (
                  <Select value={form.default_stage_id} onValueChange={v => setForm({ ...form, default_stage_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Default Stage" /></SelectTrigger>
                    <SelectContent>{stagesForPipeline.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <Button onClick={createConfig} className="w-full">Save Configuration</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="card-shadow border-accent/20 bg-accent/5">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Facebook className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Meta Lead Ads Integration</p>
                <p className="text-xs text-muted-foreground mt-1">Connect your Facebook Lead Forms to automatically capture leads into your CRM pipeline. Copy the webhook URL and paste it into your Meta Business Suite integration settings.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page Name</TableHead>
                  <TableHead>Page ID</TableHead>
                  <TableHead>Default Pipeline</TableHead>
                  <TableHead>Default Stage</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : configs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No Meta Lead configurations yet</TableCell></TableRow>
                ) : configs.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.page_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.page_id || "—"}</TableCell>
                    <TableCell className="text-sm">{c.crm_pipelines?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{c.crm_pipeline_stages?.name || "—"}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => copyWebhook(c.webhook_url)}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button></TableCell>
                    <TableCell><Switch checked={c.is_active} onCheckedChange={v => toggleConfig(c.id, v)} /></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteConfig(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Field Mapping</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3"><Badge variant="outline">full_name</Badge><ArrowRight className="h-3 w-3" /><Badge>Name</Badge></div>
              <div className="flex items-center gap-3"><Badge variant="outline">email</Badge><ArrowRight className="h-3 w-3" /><Badge>Email</Badge></div>
              <div className="flex items-center gap-3"><Badge variant="outline">phone_number</Badge><ArrowRight className="h-3 w-3" /><Badge>Phone</Badge></div>
              <div className="flex items-center gap-3"><Badge variant="outline">campaign_name</Badge><ArrowRight className="h-3 w-3" /><Badge>Source Tag</Badge></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
