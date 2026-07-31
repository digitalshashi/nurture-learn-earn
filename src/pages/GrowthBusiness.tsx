import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

export default function GrowthBusiness() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const thisMonth = new Date().toISOString().slice(0, 7) + "-01";
  const [form, setForm] = useState({ revenue: "", expenses: "" });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: g } = await supabase.from("goals" as any).select("*").eq("user_id", user!.id).eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setGoal(g);
    if (g) {
      const { data: mp } = await supabase.from("monthly_progress" as any).select("*")
        .eq("goal_id", (g as any).id).order("month", { ascending: false });
      setEntries((mp as any[]) || []);
      const current = (mp as any[])?.find(m => m.month === thisMonth);
      if (current) setForm({ revenue: String(current.revenue), expenses: String(current.expenses) });
    }
    setLoading(false);
  };

  const saveEntry = async () => {
    if (!goal) {
      toast({ title: "Set a goal first", description: "Go to the Goal tab to set a target before logging revenue.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("monthly_progress" as any).upsert({
      goal_id: goal.id,
      user_id: user!.id,
      month: thisMonth,
      revenue: Number(form.revenue) || 0,
      expenses: Number(form.expenses) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "goal_id,month" });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    loadData();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold font-display">Business</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-base">This month</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Revenue</Label>
                  <Input type="number" min="0" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expenses</Label>
                  <Input type="number" min="0" value={form.expenses} onChange={e => setForm({ ...form, expenses: e.target.value })} />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Profit: <span className="font-semibold text-foreground">{(goal?.currency || "USD")} {((Number(form.revenue) || 0) - (Number(form.expenses) || 0)).toLocaleString()}</span>
                  </p>
                  <Button onClick={saveEntry} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No entries yet. Log this month above.</p>
                ) : entries.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">
                      {new Date(e.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="h-3.5 w-3.5" />{(goal?.currency || "USD")} {Number(e.revenue).toLocaleString()}</span>
                      <span className="flex items-center gap-1 text-destructive"><TrendingDown className="h-3.5 w-3.5" />{(goal?.currency || "USD")} {Number(e.expenses).toLocaleString()}</span>
                      <span className="font-semibold">{(goal?.currency || "USD")} {Number(e.profit).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
