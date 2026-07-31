import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

interface Habit {
  id: string;
  name: string;
  xp_value: number;
  color: string;
  time_of_day: string | null;
}

interface HabitLog {
  habit_id: string;
  completed_date: string;
}

export function LevelUpHabits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [newHabit, setNewHabit] = useState({ name: "", xp_value: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user, weekStart]);

  const loadData = async () => {
    if (!user) return;
    const { data: h } = await supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true);
    setHabits(h || []);

    const weekEnd = addDays(weekStart, 6);
    const { data: l } = await supabase
      .from("habit_logs")
      .select("habit_id, completed_date")
      .eq("user_id", user.id)
      .gte("completed_date", format(weekStart, "yyyy-MM-dd"))
      .lte("completed_date", format(weekEnd, "yyyy-MM-dd"));
    setLogs(l || []);
  };

  const createHabit = async () => {
    if (!user || !newHabit.name.trim()) return;
    await supabase.from("habits").insert({ user_id: user.id, name: newHabit.name, xp_value: newHabit.xp_value });
    setNewHabit({ name: "", xp_value: 10 });
    setDialogOpen(false);
    loadData();
    toast({ title: "Habit created" });
  };

  const toggleHabit = async (habitId: string, date: Date) => {
    if (!user) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = logs.find((l) => l.habit_id === habitId && l.completed_date === dateStr);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("completed_date", dateStr).eq("user_id", user.id);
    } else {
      const habit = habits.find((h) => h.id === habitId);
      await supabase.from("habit_logs").insert({
        habit_id: habitId,
        user_id: user.id,
        completed_date: dateStr,
        xp_earned: habit?.xp_value || 10,
      });
      // Award XP
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        action: "daily_habit",
        xp_amount: habit?.xp_value || 10,
        description: `Completed habit: ${habit?.name}`,
      });
    }
    loadData();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").update({ is_active: false }).eq("id", id);
    loadData();
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const isCompleted = (habitId: string, date: Date) =>
    logs.some((l) => l.habit_id === habitId && l.completed_date === format(date, "yyyy-MM-dd"));

  return (
    <div className="p-6 space-y-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Habits</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="card-shadow overflow-auto">
            <CardContent className="pt-4 pb-2">
              <div className="grid grid-cols-7 gap-1 min-w-[600px]">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground">{format(day, "EEE")}</p>
                    <p className={`text-sm font-bold ${isSameDay(day, today) ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                ))}
              </div>
              {habits.map((habit) => (
                <div key={habit.id} className="grid grid-cols-7 gap-1 mt-1 min-w-[600px]">
                  {weekDays.map((day) => {
                    const done = isCompleted(habit.id, day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => toggleHabit(habit.id, day)}
                        className={`text-xs py-1.5 px-1 rounded truncate transition-colors ${
                          done ? "text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                        style={done ? { backgroundColor: habit.color } : {}}
                      >
                        {habit.name}
                      </button>
                    );
                  })}
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No habits yet. Create one to get started!</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Habits */}
        <div>
          <Card className="card-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Complete today's Habits ({habits.length})</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Habit</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Habit name" value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })} />
                    <Input type="number" placeholder="XP value" value={newHabit.xp_value} onChange={(e) => setNewHabit({ ...newHabit, xp_value: Number(e.target.value) })} />
                    <Button onClick={createHabit} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create Habit</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2">
              {habits.map((habit) => {
                const done = isCompleted(habit.id, today);
                return (
                  <div key={habit.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-secondary/50">
                    <Checkbox
                      checked={done}
                      onCheckedChange={() => toggleHabit(habit.id, today)}
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${done ? "line-through text-muted-foreground" : "font-medium"}`}>{habit.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{habit.xp_value} XP</Badge>
                    <button onClick={() => deleteHabit(habit.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              {habits.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No habits yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
