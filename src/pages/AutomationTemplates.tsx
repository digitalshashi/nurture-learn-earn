import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, MessageSquare, Bell, Pencil, Trash2, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  channel: string;
  category: string;
  subject: string | null;
  content: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "purchase", label: "Purchase" },
  { value: "workshop", label: "Workshop" },
  { value: "course", label: "Course" },
  { value: "reminder", label: "Reminder" },
  { value: "consultation", label: "Consultation" },
  { value: "campaign", label: "Campaign" },
  { value: "general", label: "General" },
];

export default function AutomationTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "email", category: "general", subject: "", content: "" });

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("automation_templates")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
  };

  useEffect(() => { loadTemplates(); }, [user]);

  const handleCreate = async () => {
    if (!user || !form.name) return;
    setLoading(true);
    const { error } = await supabase.from("automation_templates").insert({
      coach_id: user.id,
      name: form.name,
      channel: form.channel,
      category: form.category,
      subject: form.subject || null,
      content: form.content || null,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template created!" });
      setOpen(false);
      setForm({ name: "", channel: "email", category: "general", subject: "", content: "" });
      loadTemplates();
    }
    setLoading(false);
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("automation_templates").delete().eq("id", id);
    toast({ title: "Template deleted" });
    loadTemplates();
  };

  const channelIcon = (ch: string) => {
    if (ch === "whatsapp") return <MessageSquare className="h-4 w-4 text-green-600" />;
    if (ch === "notification") return <Bell className="h-4 w-4 text-accent" />;
    return <Mail className="h-4 w-4 text-accent" />;
  };

  const filterByChannel = (ch: string) => ch === "all" ? templates : templates.filter(t => t.channel === ch);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Automation Templates</h1>
            <p className="text-sm text-muted-foreground">Manage reusable templates for all automation channels</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Create Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Template Name</Label><Input placeholder="Welcome Email" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Channel</Label>
                    <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {form.channel === "email" && <div><Label>Subject</Label><Input placeholder="Welcome to {{course_name}}" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>}
                <div><Label>Content</Label><Textarea placeholder="Hi {{student_name}},&#10;&#10;Your message here..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} /></div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({templates.length})</TabsTrigger>
            <TabsTrigger value="email">Email ({templates.filter(t => t.channel === "email").length})</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp ({templates.filter(t => t.channel === "whatsapp").length})</TabsTrigger>
            <TabsTrigger value="notification">Notification ({templates.filter(t => t.channel === "notification").length})</TabsTrigger>
          </TabsList>

          {["all", "email", "whatsapp", "notification"].map(ch => (
            <TabsContent key={ch} value={ch}>
              {filterByChannel(ch).length === 0 ? (
                <Card className="card-shadow"><CardContent className="text-center py-12">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm font-medium">No templates yet</p>
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterByChannel(ch).map(t => (
                    <Card key={t.id} className="card-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {channelIcon(t.channel)}
                            <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTemplate(t.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-medium text-sm mb-1">{t.name}</p>
                        {t.subject && <p className="text-xs text-muted-foreground mb-1">Subject: {t.subject}</p>}
                        <p className="text-xs text-muted-foreground line-clamp-3">{t.content || "No content"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
