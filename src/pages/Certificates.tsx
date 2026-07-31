import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, Download, Edit, Trash2, Copy, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreateCertificateDialog } from "@/components/certificates/CreateCertificateDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CertTemplate {
  id: string;
  name: string;
  template_style: string;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  issued_count?: number;
}

const TEMPLATE_PREVIEWS = [
  { name: "Classic", style: "classic", color: "bg-info/10" },
  { name: "Modern", style: "modern", color: "bg-accent/10" },
  { name: "Elegant", style: "elegant", color: "bg-success/10" },
  { name: "Minimal", style: "minimal", color: "bg-secondary" },
];

const TRIGGER_LABELS: Record<string, string> = {
  course_completed: "Course Completed",
  section_completed: "Section Completed",
  service_completed: "Service Completed",
  manual: "Manual",
};

export default function Certificates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("certificate_templates")
      .select("id, name, template_style, trigger_type, is_active, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch issued counts
      const ids = data.map((t) => t.id);
      const { data: counts } = await supabase
        .from("issued_certificates")
        .select("template_id")
        .in("template_id", ids);

      const countMap: Record<string, number> = {};
      (counts || []).forEach((c: any) => {
        countMap[c.template_id] = (countMap[c.template_id] || 0) + 1;
      });

      setTemplates(
        data.map((t) => ({ ...t, issued_count: countMap[t.id] || 0 }))
      );
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("certificate_templates").update({ is_active: !current }).eq("id", id);
    fetchTemplates();
  };

  const duplicateCert = async (id: string) => {
    const { data } = await supabase.from("certificate_templates").select("*").eq("id", id).single();
    if (!data) return;
    const { id: _, created_at, updated_at, ...rest } = data;
    await supabase.from("certificate_templates").insert({ ...rest, name: rest.name + " (Copy)" });
    toast({ title: "Certificate duplicated" });
    fetchTemplates();
  };

  const deleteCert = async (id: string) => {
    await supabase.from("certificate_templates").delete().eq("id", id);
    toast({ title: "Certificate deleted" });
    fetchTemplates();
  };

  const handleCreate = () => {
    setEditId(null);
    setDialogOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setDialogOpen(true);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Certificates</h1>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />Create Certificate
          </Button>
        </div>

        {/* Template previews */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {TEMPLATE_PREVIEWS.map((t) => (
            <Card key={t.name} className={`card-shadow cursor-pointer hover:card-shadow-hover transition-shadow ${t.color}`}>
              <CardContent className="pt-8 pb-8 flex flex-col items-center gap-2">
                <Award className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-medium">{t.name} Template</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Certificate list */}
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Certificates</CardTitle>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : templates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No certificates yet. Click "Create Certificate" to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{t.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {TRIGGER_LABELS[t.trigger_type] || t.trigger_type}
                      </TableCell>
                      <TableCell>
                        <Badge className={t.is_active ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>
                          {t.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{t.issued_count}</TableCell>
                      <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(t.id)}>
                              <Edit className="h-3.5 w-3.5 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(t.id, t.is_active)}>
                              {t.is_active ? <ToggleLeft className="h-3.5 w-3.5 mr-2" /> : <ToggleRight className="h-3.5 w-3.5 mr-2" />}
                              {t.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateCert(t.id)}>
                              <Copy className="h-3.5 w-3.5 mr-2" />Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteCert(t.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCertificateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchTemplates}
        editId={editId}
      />
    </AppLayout>
  );
}
