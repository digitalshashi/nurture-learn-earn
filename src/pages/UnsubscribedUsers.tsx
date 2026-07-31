import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Copy, UserMinus, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UnsubRow {
  id: string;
  email: string;
  reason: string | null;
  unsubscribed_at: string;
}

export default function UnsubscribedUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unsubs, setUnsubs] = useState<UnsubRow[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_unsubscribed")
      .select("*")
      .eq("coach_id", user.id)
      .order("unsubscribed_at", { ascending: false });
    setUnsubs((data as UnsubRow[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleAdd = async () => {
    if (!user || !emails.trim()) return;
    const list = emails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes("@"));
    const inserts = list.map(email => ({ coach_id: user.id, email }));
    const { error } = await supabase.from("email_unsubscribed").insert(inserts as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${list.length} email(s) added to unsubscribe list` });
      setOpen(false);
      setEmails("");
      load();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("email_unsubscribed").delete().eq("id", id);
    toast({ title: "Removed from unsubscribe list" });
    load();
  };

  const handleExport = () => {
    const csv = "email,reason,date\n" + unsubs.map(u => `${u.email},${u.reason || ""},${u.unsubscribed_at}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unsubscribed_users.csv";
    a.click();
  };

  const filtered = unsubs.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold font-display">Unsubscribed Users</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Add Emails</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add to Unsubscribe List</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Email Addresses</Label>
                  <Textarea placeholder="Enter emails, one per line..." rows={5} value={emails} onChange={(e) => setEmails(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {emails.split(/[\n,;]+/).filter(e => e.trim().includes("@")).length} email(s)
                  </p>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAdd}>Add to List</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Users who unsubscribed from your email broadcasts ({unsubs.length} total)</p>

        <Card className="card-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <Input placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
              <Button variant="outline" size="sm" className="ml-auto" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <UserMinus className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="font-semibold text-sm">No unsubscribed users</p>
                      <p className="text-xs text-muted-foreground mt-1">Users who unsubscribe from broadcasts will appear here</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{u.email}</span>
                        <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => {
                          navigator.clipboard.writeText(u.email);
                          toast({ title: "Copied!" });
                        }} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.reason || "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(u.unsubscribed_at), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
