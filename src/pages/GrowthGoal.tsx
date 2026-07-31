import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Target, TrendingUp } from "lucide-react";
import { buildStaircase, stageForRevenue } from "@/lib/goalMath";

export default function GrowthGoal() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    target_amount: "",
    target_date: "",
    starting_monthly_revenue: "",
    currency: "USD",
    pace: "steady",
  });

  useEffect(() => { if (user) loadGoal(); }, [user]);

  const loadGoal = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals" as any)
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const g = data as any;
      setGoal(g);
      setForm({
        target_amount: String(g.target_amount),
        target_date: g.target_date,
        starting_monthly_revenue: String(g.starting_monthly_revenue),
        currency: g.currency,
        pace: g.pace,
      });
    }
    setLoading(false);
  };

  const saveGoal = async () => {
    if (!form.target_amount || !form.target_date) {
      toast({ title: "Target amount and date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user!.id,
      target_amount: Number(form.target_amount),
      target_date: form.target_date,
      starting_monthly_revenue: Number(form.starting_monthly_revenue || 0),
      currency: form.currency,
      pace: form.pace,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = goal
      ? await supabase.from("goals" as any).update(payload).eq("id", goal.id)
      : await supabase.from("goals" as any).insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: goal ? "Goal updated" : "Goal set" });
    loadGoal();
  };

  const staircase = goal
    ? buildStaircase(Number(form.starting_monthly_revenue || 0), Number(form.target_amount), form.target_date)
    : [];
  const yearlyStaircase = staircase.filter((_, i) => (i + 1) % 12 === 0 || i === staircase.length - 1);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold font-display">Goal</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-base">{goal ? "Update your goal" : "Set your income goal"}</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Target monthly revenue</Label>
                  <Input type="number" min="0" placeholder="10000" value={form.target_amount}
                    onChange={e => setForm({ ...form, target_amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Target date</Label>
                  <Input type="date" value={form.target_date}
                    onChange={e => setForm({ ...form, target_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Current monthly revenue</Label>
                  <Input type="number" min="0" placeholder="0" value={form.starting_monthly_revenue}
                    onChange={e => setForm({ ...form, starting_monthly_revenue: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Pace</Label>
                  <Select value={form.pace} onValueChange={v => setForm({ ...form, pace: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="steady">Steady</SelectItem>
                      <SelectItem value="gradual">Gradual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Button onClick={saveGoal} disabled={saving} className="w-full sm:w-auto">
                    {saving ? "Saving..." : goal ? "Update Goal" : "Set Goal"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {goal && staircase.length > 0 && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Your path to {form.currency} {Number(form.target_amount).toLocaleString()}/mo
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Currently at stage: {stageForRevenue(Number(form.starting_monthly_revenue || 0))}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {yearlyStaircase.map((step, i) => {
                    const pct = Math.min(100, (step.targetRevenue / Number(form.target_amount)) * 100);
                    return (
                      <div key={step.month} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{step.label}</span>
                          <span className="font-medium">{form.currency} {step.targetRevenue.toLocaleString()}/mo</span>
                        </div>
                        <Progress value={pct} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
