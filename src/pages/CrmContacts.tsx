import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, Trash2, UserCheck, Download, Upload, Edit2, Tags } from "lucide-react";
import { EditContactDialog } from "@/components/crm/EditContactDialog";
import { ImportContactsDialog } from "@/components/crm/ImportContactsDialog";
import { ConvertToCustomerDialog } from "@/components/crm/ConvertToCustomerDialog";

export default function CrmContacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editContact, setEditContact] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [convertContact, setConvertContact] = useState<any>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_leads").select("*, crm_pipelines(name), crm_pipeline_stages(name)").eq("coach_id", user!.id).order("name");
    setLeads(data || []);
    setLoading(false);
    setSelected(new Set());
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await supabase.from("crm_leads").delete().eq("id", id);
    toast({ title: "Contact deleted" });
    loadData();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} contacts?`)) return;
    for (const id of selected) {
      await supabase.from("crm_leads").delete().eq("id", id);
    }
    toast({ title: `${selected.size} contacts deleted` });
    loadData();
  };

  const bulkAddTag = async () => {
    const tag = prompt("Enter tag to add:");
    if (!tag?.trim()) return;
    for (const id of selected) {
      const lead = leads.find(l => l.id === id);
      if (!lead) continue;
      const tags = [...(lead.tags || [])];
      if (!tags.includes(tag.trim())) tags.push(tag.trim());
      await supabase.from("crm_leads").update({ tags, updated_at: new Date().toISOString() }).eq("id", id);
    }
    toast({ title: `Tag added to ${selected.size} contacts` });
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

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id)));
  };

  const filtered = leads.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.name?.toLowerCase().includes(s) && !l.email?.toLowerCase().includes(s) && !l.phone?.includes(s) && !(l.tags || []).some((t: string) => t.toLowerCase().includes(s))) return false;
    }
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterSource !== "all" && l.source !== filterSource) return false;
    return true;
  });

  const sources = [...new Set(leads.map(l => l.source).filter(Boolean))];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold font-display">Contacts</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import CSV</Button>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, phone, tags..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="converted">Customer</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={bulkAddTag}><Tags className="h-3.5 w-3.5 mr-1" />Add Tag</Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
          </div>
        )}

        <Card className="card-shadow">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
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
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No contacts found</TableCell></TableRow>
                ) : filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} /></TableCell>
                    <TableCell className="font-medium text-sm">{l.name}</TableCell>
                    <TableCell className="text-sm">{l.email || "—"}</TableCell>
                    <TableCell className="text-sm">{l.phone || "—"}</TableCell>
                    <TableCell className="text-sm">{l.city || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{l.source}</Badge></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{(l.tags || []).map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div></TableCell>
                    <TableCell><Badge variant={l.status === "converted" ? "default" : "outline"} className="text-xs">{l.status === "converted" ? "Customer" : l.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/crm/leads/${l.id}`)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditContact(l); setEditOpen(true); }} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
                        {l.status !== "converted" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => { setConvertContact(l); setConvertOpen(true); }} title="Convert to Customer"><UserCheck className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLead(l.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <EditContactDialog open={editOpen} onOpenChange={setEditOpen} contact={editContact} onSaved={loadData} />
      <ImportContactsDialog open={importOpen} onOpenChange={setImportOpen} onImported={loadData} />
      <ConvertToCustomerDialog open={convertOpen} onOpenChange={setConvertOpen} contact={convertContact} onConverted={loadData} />
    </AppLayout>
  );
}
