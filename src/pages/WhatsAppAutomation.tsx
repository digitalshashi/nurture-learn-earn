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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MessageSquare, Pencil, Trash2, Eye, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  header_type: string;
  body_text: string;
  footer_text: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "utility", label: "Utility" },
  { value: "marketing", label: "Marketing" },
  { value: "authentication", label: "Authentication" },
];

const defaultTemplate = {
  name: "",
  category: "utility",
  header_type: "none",
  header_content: "",
  body_text: "",
  footer_text: "",
};

export default function WhatsAppAutomation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultTemplate });

  const loadTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates((data as WhatsAppTemplate[]) || []);
  };

  useEffect(() => { loadTemplates(); }, [user]);

  const handleCreate = async () => {
    if (!user || !form.name || !form.body_text) {
      toast({ title: "Please fill name and body text", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("whatsapp_templates").insert({
      coach_id: user.id,
      name: form.name,
      category: form.category,
      header_type: form.header_type,
      header_content: form.header_content || null,
      body_text: form.body_text,
      footer_text: form.footer_text || null,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template created!" });
      setOpen(false);
      setForm({ ...defaultTemplate });
      loadTemplates();
    }
    setLoading(false);
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast({ title: "Template deleted" });
    loadTemplates();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">WhatsApp Automation</h1>
            <p className="text-sm text-muted-foreground">Manage WhatsApp templates and automations</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create WhatsApp Template</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Template Name</Label><Input placeholder="Purchase Confirmation" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Header Type</Label>
                  <Select value={form.header_type} onValueChange={(v) => setForm({ ...form, header_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.header_type !== "none" && (
                  <div><Label className="text-xs">Header Content</Label><Input placeholder={form.header_type === "image" ? "Image URL" : "Header text"} value={form.header_content} onChange={(e) => setForm({ ...form, header_content: e.target.value })} /></div>
                )}
                <div>
                  <Label>Body Text</Label>
                  <Textarea placeholder={"Hi {{name}}\n\nCongratulations! 🎉\nYou have enrolled in {{course_name}}.\n\nLogin: {{login_link}}"} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} rows={5} />
                  <p className="text-[10px] text-muted-foreground mt-1">Use {"{{variable}}"} for dynamic content</p>
                </div>
                <div><Label>Footer (optional)</Label><Input placeholder="Reply STOP to unsubscribe" value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} /></div>

                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Templates</p><p className="text-2xl font-bold">{templates.length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-success">{templates.filter(t => t.status === "approved").length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{templates.filter(t => t.status === "pending" || t.status === "draft").length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{templates.filter(t => t.status === "rejected").length}</p></CardContent></Card>
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Templates</CardTitle></CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-medium">No WhatsApp templates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create templates for automated WhatsApp messages</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.body_text}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{t.category}</Badge></TableCell>
                      <TableCell>
                        <Badge className={
                          t.status === "approved" ? "bg-success text-success-foreground text-xs" :
                          t.status === "rejected" ? "bg-destructive text-destructive-foreground text-xs" :
                          "bg-warning text-warning-foreground text-xs"
                        }>{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
