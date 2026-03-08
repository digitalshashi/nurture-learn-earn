import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowDown, Mail, MessageSquare, Bell, Zap, Clock, Trash2, Play, Pause } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const TRIGGERS = [
  { value: "user_signup", label: "User Signup" },
  { value: "course_purchase", label: "Course Purchase" },
  { value: "course_enrollment", label: "Course Enrollment" },
  { value: "workshop_registration", label: "Workshop Registration" },
  { value: "workshop_reminder", label: "Workshop Reminder" },
  { value: "course_completion", label: "Course Completion" },
  { value: "lesson_completion", label: "Lesson Completion" },
  { value: "incomplete_order", label: "Incomplete Order" },
  { value: "payment_failure", label: "Payment Failure" },
  { value: "new_community_post", label: "New Community Post" },
  { value: "consultation_booking", label: "Consultation Booking" },
  { value: "subscription_expiry", label: "Subscription Expiry" },
];

const ACTIONS = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_whatsapp", label: "Send WhatsApp", icon: MessageSquare },
  { value: "send_notification", label: "Send Notification", icon: Bell },
  { value: "assign_tag", label: "Assign Tag", icon: Zap },
  { value: "grant_xp", label: "Grant XP Points", icon: Zap },
];

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  channel: string;
  is_active: boolean;
  created_at: string;
  automation_actions: { id: string; action_type: string; delay_minutes: number; sort_order: number }[];
}

export default function AutomationPath() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_type: "course_purchase",
    steps: [{ action_type: "send_email", delay_minutes: 0 }],
  });

  const loadAutomations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("automations")
      .select("*, automation_actions(*)")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setAutomations((data as any) || []);
  };

  useEffect(() => { loadAutomations(); }, [user]);

  const handleCreate = async () => {
    if (!user || !form.name) return;
    setLoading(true);

    const { data: auto, error } = await supabase.from("automations").insert({
      coach_id: user.id,
      name: form.name,
      description: form.description,
      trigger_type: form.trigger_type,
      channel: form.steps[0]?.action_type.includes("whatsapp") ? "whatsapp" : form.steps[0]?.action_type.includes("notification") ? "notification" : "email",
    } as any).select().single();

    if (error || !auto) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const actions = form.steps.map((s, i) => ({
      automation_id: auto.id,
      action_type: s.action_type,
      delay_minutes: s.delay_minutes,
      sort_order: i,
    }));

    await supabase.from("automation_actions").insert(actions as any);
    toast({ title: "Automation created!" });
    setOpen(false);
    setForm({ name: "", description: "", trigger_type: "course_purchase", steps: [{ action_type: "send_email", delay_minutes: 0 }] });
    loadAutomations();
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("automations").update({ is_active: !current } as any).eq("id", id);
    loadAutomations();
  };

  const deleteAutomation = async (id: string) => {
    await supabase.from("automations").delete().eq("id", id);
    toast({ title: "Automation deleted" });
    loadAutomations();
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { action_type: "send_email", delay_minutes: 60 }] });
  };

  const removeStep = (i: number) => {
    setForm({ ...form, steps: form.steps.filter((_, idx) => idx !== i) });
  };

  const updateStep = (i: number, field: string, value: any) => {
    const steps = [...form.steps];
    (steps[i] as any)[field] = value;
    setForm({ ...form, steps });
  };

  const channelIcon = (type: string) => {
    if (type.includes("whatsapp")) return <MessageSquare className="h-3.5 w-3.5" />;
    if (type.includes("notification")) return <Bell className="h-3.5 w-3.5" />;
    return <Mail className="h-3.5 w-3.5" />;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Automation Paths</h1>
            <p className="text-sm text-muted-foreground">Build automated workflows with triggers and actions</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Create Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Automation Path</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Automation Name</Label><Input placeholder="Welcome Sequence" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea placeholder="Describe your automation..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>

                <div>
                  <Label>Trigger</Label>
                  <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Action Steps</Label>
                  {form.steps.map((step, i) => (
                    <div key={i} className="space-y-2">
                      {i > 0 && (
                        <div className="flex items-center gap-2 justify-center">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <Input type="number" className="w-20 h-7 text-xs" value={step.delay_minutes} onChange={(e) => updateStep(i, "delay_minutes", parseInt(e.target.value) || 0)} />
                            <span className="text-xs text-muted-foreground">min delay</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                        <Select value={step.action_type} onValueChange={(v) => updateStep(i, "action_type", v)}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                        </Select>
                        {form.steps.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addStep} className="w-full">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                  </Button>
                </div>

                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating..." : "Create Automation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Automations</p><p className="text-2xl font-bold">{automations.filter(a => a.is_active).length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Automations</p><p className="text-2xl font-bold">{automations.length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Email Actions</p><p className="text-2xl font-bold">{automations.reduce((acc, a) => acc + (a.automation_actions?.filter(x => x.action_type === "send_email").length || 0), 0)}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">WhatsApp Actions</p><p className="text-2xl font-bold">{automations.reduce((acc, a) => acc + (a.automation_actions?.filter(x => x.action_type === "send_whatsapp").length || 0), 0)}</p></CardContent></Card>
        </div>

        {/* Automations list */}
        <div className="space-y-3">
          {automations.length === 0 ? (
            <Card className="card-shadow"><CardContent className="text-center py-12">
              <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm font-medium">No automations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first automation path</p>
            </CardContent></Card>
          ) : automations.map((auto) => (
            <Card key={auto.id} className="card-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Zap className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{auto.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{auto.trigger_type.replace(/_/g, " ")}</Badge>
                        <span className="text-muted-foreground text-[10px]">→</span>
                        {auto.automation_actions?.map((action, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] flex items-center gap-0.5">
                            {channelIcon(action.action_type)}
                            {action.action_type.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={auto.is_active ? "bg-success text-success-foreground text-xs" : "bg-muted text-muted-foreground text-xs"}>
                      {auto.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(auto.id, auto.is_active)}>
                      {auto.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAutomation(auto.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
