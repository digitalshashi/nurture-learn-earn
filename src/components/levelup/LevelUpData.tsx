import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface DataEntry {
  id: string;
  date: string;
  revenue_earned: number;
  ad_spends: number;
  avg_cost_per_lead: number;
  total_leads: number;
  total_paid_customers: number;
  total_group_size: number;
  roas: number;
}

export function LevelUpData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: "", revenue_earned: 0, ad_spends: 0, avg_cost_per_lead: 0,
    total_leads: 0, total_paid_customers: 0, total_group_size: 0, roas: 0,
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data } = await supabase.from("productivity_data").select("*").eq("user_id", user.id).order("date", { ascending: false });
    setEntries(data || []);
  };

  const saveEntry = async () => {
    if (!user || !form.date) return;
    await supabase.from("productivity_data").insert({ ...form, user_id: user.id });
    setShowForm(false);
    setForm({ date: "", revenue_earned: 0, ad_spends: 0, avg_cost_per_lead: 0, total_leads: 0, total_paid_customers: 0, total_group_size: 0, roas: 0 });
    loadData();
    toast({ title: "Data saved" });
  };

  if (showForm) {
    return (
      <div className="p-6 max-w-xl">
        <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Data
        </button>
        <h2 className="text-lg font-bold mb-4">Add Data</h2>
        <div className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Revenue Earned</Label><Input type="number" value={form.revenue_earned} onChange={(e) => setForm({ ...form, revenue_earned: Number(e.target.value) })} /></div>
          <div><Label>Ad Spends</Label><Input type="number" value={form.ad_spends} onChange={(e) => setForm({ ...form, ad_spends: Number(e.target.value) })} /></div>
          <div><Label>Average Cost Per Lead</Label><Input type="number" value={form.avg_cost_per_lead} onChange={(e) => setForm({ ...form, avg_cost_per_lead: Number(e.target.value) })} /></div>
          <div><Label>Total Leads Generated</Label><Input type="number" value={form.total_leads} onChange={(e) => setForm({ ...form, total_leads: Number(e.target.value) })} /></div>
          <div><Label>Total Paid Customers</Label><Input type="number" value={form.total_paid_customers} onChange={(e) => setForm({ ...form, total_paid_customers: Number(e.target.value) })} /></div>
          <div><Label>Total Group Size</Label><Input type="number" value={form.total_group_size} onChange={(e) => setForm({ ...form, total_group_size: Number(e.target.value) })} /></div>
          <div><Label>ROAS</Label><Input type="number" step="0.01" value={form.roas} onChange={(e) => setForm({ ...form, roas: Number(e.target.value) })} /></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={saveEntry} className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Data</h2>
        <Button onClick={() => setShowForm(true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          <Plus className="h-4 w-4 mr-1" /> Add Data
        </Button>
      </div>

      <Card className="card-shadow overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Total Revenue</TableHead>
              <TableHead>Ad Spends</TableHead>
              <TableHead>Avg Cost/Lead</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Paid Customers</TableHead>
              <TableHead>Group Size</TableHead>
              <TableHead>ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No Data found</TableCell></TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                <TableCell>₹{e.revenue_earned}</TableCell>
                <TableCell>₹{e.ad_spends}</TableCell>
                <TableCell>₹{e.avg_cost_per_lead}</TableCell>
                <TableCell>{e.total_leads}</TableCell>
                <TableCell>{e.total_paid_customers}</TableCell>
                <TableCell>{e.total_group_size}</TableCell>
                <TableCell>{e.roas}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
