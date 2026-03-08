import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface CharityEntry {
  id: string;
  date: string;
  organization_name: string;
  category: string | null;
  amount: number;
}

export function LevelUpCharity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<CharityEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: "", organization_name: "", category: "", amount: 0 });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data } = await supabase.from("charity_logs").select("*").eq("user_id", user.id).order("date", { ascending: false });
    setEntries(data || []);
  };

  const saveEntry = async () => {
    if (!user || !form.organization_name || !form.date) return;
    await supabase.from("charity_logs").insert({ ...form, user_id: user.id });
    setDialogOpen(false);
    setForm({ date: "", organization_name: "", category: "", amount: 0 });
    loadData();
    toast({ title: "Charity entry added" });
  };

  const filtered = entries.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  // Chart data - monthly aggregation
  const chartData = entries.reduce<Record<string, number>>((acc, e) => {
    const month = e.date.substring(0, 7);
    acc[month] = (acc[month] || 0) + e.amount;
    return acc;
  }, {});
  const chartArr = Object.entries(chartData).sort().slice(-6).map(([month, amount]) => ({
    month: format(new Date(month + "-01"), "MMM"),
    amount,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Charity</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-1" /> Add Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Charity Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Organization Name</Label><Input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <Button onClick={saveEntry} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chart */}
      <Card className="card-shadow">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Charity Tracker</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            {chartArr.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartArr}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div>
        <p className="text-sm font-medium mb-2">Filter By Date</p>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-[180px]" placeholder="Start date" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="max-w-[180px]" placeholder="End date" />
        </div>
      </div>

      {/* Table */}
      <Card className="card-shadow overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Organization Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No Data found</TableCell></TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                <TableCell>{e.organization_name}</TableCell>
                <TableCell>{e.category || "–"}</TableCell>
                <TableCell>₹{e.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
