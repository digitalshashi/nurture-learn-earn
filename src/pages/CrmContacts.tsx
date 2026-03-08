import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, Trash2, UserCheck, Download } from "lucide-react";

export default function CrmContacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_leads").select("*, crm_pipelines(name), crm_pipeline_stages(name)").eq("coach_id", user!.id).order("name");
    setLeads(data || []);
    setLoading(false);
  };

  const convertToCustomer = async (id: string) => {
    await supabase.from("crm_leads").update({ status: "converted", converted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Lead converted to customer" });
    loadData();
  };

  const deleteLead = async (id: string) => {
    await supabase.from("crm_leads").delete().eq("id", id);
    toast({ title: "Contact deleted" });
    loadData();
  };

  const exportCSV = () => {
    const csv = ["Name,Email,Phone,City,Source,Status,Tags"]
      .concat(leads.map(l => `${l.name},${l.email || ""},${l.phone || ""},${l.city || ""},${l.source},${l.status},"${(l.tags || []).join(",")}"`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contacts.csv"; a.click();
  };

  const filtered = leads.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.name?.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s) || l.phone?.includes(s);
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">Contacts</h1>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-9 max-w-md" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Card className="card-shadow">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No contacts found</TableCell></TableRow>
                ) : filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">{l.name}</TableCell>
                    <TableCell className="text-sm">{l.email || "—"}</TableCell>
                    <TableCell className="text-sm">{l.phone || "—"}</TableCell>
                    <TableCell className="text-sm">{l.city || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{l.source}</Badge></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{(l.tags || []).map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div></TableCell>
                    <TableCell><Badge variant={l.status === "converted" ? "default" : "outline"} className="text-xs">{l.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/crm/leads/${l.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                        {l.status !== "converted" && <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => convertToCustomer(l.id)}><UserCheck className="h-3.5 w-3.5" /></Button>}
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
