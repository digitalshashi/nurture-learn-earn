import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Save, Trash2 } from "lucide-react";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  onSaved: () => void;
}

export function EditContactDialog({ open, onOpenChange, contact, onSaved }: EditContactDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<any>({});
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        city: contact.city || "",
        source: contact.source || "manual",
        pipeline_id: contact.pipeline_id || "",
        stage_id: contact.stage_id || "",
        status: contact.status || "open",
        tags: (contact.tags || []).join(", "),
        pipeline_value: contact.pipeline_value || 0,
      });
    }
  }, [contact]);

  useEffect(() => {
    if (user && open) {
      Promise.all([
        supabase.from("crm_pipelines").select("*").eq("coach_id", user.id),
        supabase.from("crm_pipeline_stages").select("*").order("sort_order"),
      ]).then(([{ data: p }, { data: s }]) => {
        setPipelines(p || []);
        setStages(s || []);
      });
    }
  }, [user, open]);

  const save = async () => {
    if (!form.name?.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("crm_leads").update({
      name: form.name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      city: form.city?.trim() || null,
      source: form.source,
      pipeline_id: form.pipeline_id || null,
      stage_id: form.stage_id || null,
      status: form.status,
      pipeline_value: Number(form.pipeline_value) || 0,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      updated_at: new Date().toISOString(),
    }).eq("id", contact.id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contact updated" });
    onOpenChange(false);
    onSaved();
  };

  const deleteContact = async () => {
    if (!confirm("Delete this contact permanently?")) return;
    await supabase.from("crm_leads").delete().eq("id", contact.id);
    toast({ title: "Contact deleted" });
    onOpenChange(false);
    onSaved();
  };

  const pipelineStages = stages.filter(s => s.pipeline_id === form.pipeline_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city || ""} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Lead Source</Label>
            <Select value={form.source || "manual"} onValueChange={v => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="meta_ads">Meta Ads</SelectItem>
                <SelectItem value="landing_page">Landing Page</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Pipeline</Label>
            <Select value={form.pipeline_id || "none"} onValueChange={v => setForm({ ...form, pipeline_id: v === "none" ? "" : v, stage_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Select Pipeline" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Pipeline</SelectItem>
                {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {pipelineStages.length > 0 && (
            <div><Label>Stage</Label>
              <Select value={form.stage_id || "none"} onValueChange={v => setForm({ ...form, stage_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Stage</SelectItem>
                  {pipelineStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Status</Label>
            <Select value={form.status || "open"} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tags (comma separated)</Label><Input value={form.tags || ""} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          <div><Label>Pipeline Value (₹)</Label><Input type="number" value={form.pipeline_value || 0} onChange={e => setForm({ ...form, pipeline_value: e.target.value })} /></div>
        </div>
        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          <Button variant="destructive" size="sm" onClick={deleteContact}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
