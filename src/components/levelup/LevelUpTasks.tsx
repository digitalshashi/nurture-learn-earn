import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay } from "date-fns";

interface Task {
  id: string;
  name: string;
  deadline: string | null;
  xp_reward: number;
  is_completed: boolean;
}

export function LevelUpTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newTask, setNewTask] = useState({ name: "", deadline: "", xp_reward: 20 });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    const { data } = await supabase.from("student_tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTasks(data || []);
  };

  const createTask = async () => {
    if (!user || !newTask.name.trim()) return;
    await supabase.from("student_tasks").insert({
      user_id: user.id,
      name: newTask.name,
      deadline: newTask.deadline || null,
      xp_reward: newTask.xp_reward,
    });
    setNewTask({ name: "", deadline: "", xp_reward: 20 });
    setDialogOpen(false);
    loadTasks();
    toast({ title: "Task created" });
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    const completed = !task.is_completed;
    await supabase.from("student_tasks").update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", task.id);

    if (completed) {
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        action: "task_completed",
        xp_amount: task.xp_reward,
        description: `Completed task: ${task.name}`,
      });
    }
    loadTasks();
  };

  const pendingCount = tasks.filter((t) => !t.is_completed).length;
  const today = new Date();
  const todayTasks = tasks.filter((t) => !t.is_completed);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Tasks</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Plus className="h-4 w-4 mr-1" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Task name" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} />
              <Input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} />
              <Input type="number" placeholder="XP reward" value={newTask.xp_reward} onChange={(e) => setNewTask({ ...newTask, xp_reward: Number(e.target.value) })} />
              <Button onClick={createTask} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Tasks Pending</p>
            <p className="text-2xl font-bold text-accent">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-success">{tasks.length - pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="card-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addDays(monthStart, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addDays(monthEnd, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <p key={d} className="text-xs font-semibold text-muted-foreground py-1">{d}</p>
                ))}
                {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
                {monthDays.map((day) => {
                  const dayTasks = tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), day));
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-1 min-h-[60px] rounded text-xs ${
                        isSameDay(day, today) ? "bg-primary/10 font-bold" : ""
                      } ${!isSameMonth(day, currentMonth) ? "text-muted-foreground/30" : ""}`}
                    >
                      <p className="text-right">{format(day, "d")}</p>
                      {dayTasks.slice(0, 2).map((t) => (
                        <div key={t.id} className={`mt-0.5 px-1 py-0.5 rounded truncate text-[10px] ${t.is_completed ? "bg-success/20 text-success" : "bg-accent/20 text-accent"}`}>
                          {t.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today/Tomorrow tasks */}
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Complete Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">You don't have any pending tasks</p>
            )}
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-2">
                <Checkbox checked={task.is_completed} onCheckedChange={() => toggleTask(task)} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.name}</p>
                  {task.deadline && <p className="text-xs text-muted-foreground">Due: {format(new Date(task.deadline), "MMM d")}</p>}
                </div>
                <Badge variant="outline" className="text-xs">{task.xp_reward} XP</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
