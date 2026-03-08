import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, CheckCircle, Target, TrendingUp, ArrowRight, Checkbox } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  full_name: string;
}

interface HabitToday {
  id: string;
  name: string;
  xp_value: number;
  time_of_day: string | null;
  completed: boolean;
}

const RANK_COLORS = [
  "bg-gradient-to-r from-amber-400 to-amber-500",
  "bg-gradient-to-r from-rose-400 to-rose-500",
  "bg-gradient-to-r from-violet-400 to-violet-500",
  "bg-gradient-to-r from-pink-400 to-pink-500",
];

export function LevelUpDashboard() {
  const { user } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState({ level_number: 1, badge_name: "Beginner", xp_required: 0 });
  const [nextLevel, setNextLevel] = useState<{ xp_required: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({ habits: 0, tasks: 0, challenges: 0, totalChallenges: 0 });
  const [xpHistory, setXpHistory] = useState<any[]>([]);
  const [userName, setUserName] = useState("Student");
  const [todayHabits, setTodayHabits] = useState<HabitToday[]>([]);
  const [percentile, setPercentile] = useState(0);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;

    // Profile
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    if (profile?.full_name) setUserName(profile.full_name);

    // Total XP
    const { data: xpData } = await supabase.from("xp_transactions").select("xp_amount").eq("user_id", user.id);
    const xp = xpData?.reduce((sum, t) => sum + t.xp_amount, 0) || 0;
    setTotalXp(xp);

    // Levels
    const { data: levels } = await supabase.from("level_definitions").select("*").order("xp_required", { ascending: true });
    if (levels) {
      const current = [...levels].reverse().find((l) => xp >= l.xp_required);
      if (current) setLevel(current);
      const next = levels.find((l) => l.xp_required > xp);
      setNextLevel(next || null);
    }

    // Stats
    const { count: habitCount } = await supabase.from("habit_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    const { count: taskCount } = await supabase.from("student_tasks").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_completed", true);
    const { count: challengeCount } = await supabase.from("challenge_participants").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_completed", true);
    const { count: totalChallenges } = await supabase.from("gamification_challenges").select("*", { count: "exact", head: true }).eq("is_active", true);
    setStats({ habits: habitCount || 0, tasks: taskCount || 0, challenges: challengeCount || 0, totalChallenges: totalChallenges || 0 });

    // Leaderboard
    const { data: allXp } = await supabase.from("xp_transactions").select("user_id, xp_amount");
    if (allXp) {
      const byUser: Record<string, number> = {};
      allXp.forEach((t) => { byUser[t.user_id] = (byUser[t.user_id] || 0) + t.xp_amount; });
      const sorted = Object.entries(byUser).sort(([, a], [, b]) => b - a);
      const myRank = sorted.findIndex(([id]) => id === user.id);
      if (sorted.length > 1) setPercentile(Math.round(((sorted.length - myRank) / sorted.length) * 100));
      const top10 = sorted.slice(0, 10);
      const userIds = top10.map(([id]) => id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      setLeaderboard(top10.map(([uid, xpVal]) => ({
        user_id: uid,
        total_xp: xpVal,
        full_name: profiles?.find((p) => p.id === uid)?.full_name || "User",
      })));
    }

    // Today's habits
    const today = new Date().toISOString().split("T")[0];
    const { data: habits } = await supabase.from("habits").select("id, name, xp_value, time_of_day").eq("user_id", user.id).eq("is_active", true);
    const { data: todayLogs } = await supabase.from("habit_logs").select("habit_id").eq("user_id", user.id).eq("completed_date", today);
    const completedIds = new Set((todayLogs || []).map((l: any) => l.habit_id));
    setTodayHabits((habits || []).map((h: any) => ({ ...h, completed: completedIds.has(h.id) })));

    // XP history (last 7 days)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    const { data: recentXp } = await supabase.from("xp_transactions").select("xp_amount, created_at").eq("user_id", user.id).gte("created_at", days[0]);
    setXpHistory(days.map((day) => {
      const dayLabel = new Date(day).toLocaleDateString("en", { weekday: "short" });
      const yourXp = recentXp?.filter((t) => t.created_at.startsWith(day)).reduce((s, t) => s + t.xp_amount, 0) || 0;
      return { day: dayLabel, you: yourXp, community: Math.floor(Math.random() * 50 + 10) };
    }));
  };

  const completeHabit = async (habitId: string, xpValue: number) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("habit_logs").insert({ habit_id: habitId, user_id: user.id, completed_date: today, xp_earned: xpValue });
    await supabase.from("xp_transactions").insert({ user_id: user.id, action: "daily_habit", xp_amount: xpValue, description: "Completed habit" });
    loadAll();
  };

  const xpProgress = nextLevel
    ? Math.round(((totalXp - level.xp_required) / (nextLevel.xp_required - level.xp_required)) * 100)
    : 100;

  const formatXp = (xp: number) => xp >= 1000 ? `${(xp / 1000).toFixed(1)}K` : String(xp);

  const habitXpToday = todayHabits.filter(h => h.completed).reduce((s, h) => s + h.xp_value, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Habit Chart + Stats */}
        <div className="lg:col-span-5 space-y-5">
          {/* Habit Performance Card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="pb-2 flex flex-row items-center justify-between bg-card">
              <CardTitle className="text-base font-bold">Habit</CardTitle>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Points gained</p>
                <p className="text-lg font-bold text-amber-500">🪙 {habitXpToday} XP</p>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex gap-6 text-xs mb-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Your avg completion rate <strong>{stats.habits > 0 ? Math.round((todayHabits.filter(h => h.completed).length / Math.max(todayHabits.length, 1)) * 100) : 0}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Community avg completion rate <strong>1.55%</strong>
                </span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={xpHistory}>
                    <defs>
                      <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(200 80% 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(200 80% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Area type="monotone" dataKey="you" stroke="hsl(200 80% 50%)" strokeWidth={2.5} fill="url(#colorYou)" />
                    <Line type="monotone" dataKey="community" stroke="hsl(0 70% 60%)" strokeWidth={2} dot={false} strokeDasharray="6 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Task + Challenge Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Task</p>
                      <span className="text-lg font-bold text-muted-foreground">{stats.tasks > 0 ? Math.round((stats.tasks / Math.max(stats.tasks, 1)) * 100) : 0}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Completion <strong>{stats.tasks}</strong>/{stats.tasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-md">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Challenge</p>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Points gained</p>
                        <p className="text-sm font-bold text-amber-500">🪙 0 XP</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Active / All Challenges <strong>{stats.challenges}</strong>/{stats.totalChallenges}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Motivational Banner */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="py-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">
                  🎉 You are doing better than <span className="text-emerald-600 dark:text-emerald-400">{percentile}%</span> of other members
                </p>
              </div>
              <div className="text-4xl">🏆</div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Leaderboard */}
        <div className="lg:col-span-4">
          <Card className="border-0 shadow-lg h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Levelup Members Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 overflow-auto max-h-[520px]">
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              )}
              {leaderboard.map((entry, i) => {
                const isTop4 = i < 4;
                const initials = entry.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all ${
                      isTop4 ? `${RANK_COLORS[i]} text-white shadow-md` : "hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isTop4 ? "bg-white/20" : "bg-muted"
                    }`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </div>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`text-xs font-bold ${isTop4 ? "bg-white/20 text-white" : "bg-secondary"}`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`flex-1 text-sm font-medium truncate ${isTop4 ? "" : "text-foreground"}`}>
                      {entry.full_name}
                    </span>
                    <Badge className={`shrink-0 ${isTop4 ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>
                      🪙 {formatXp(entry.total_xp)} XP
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Profile + Today's Habits */}
        <div className="lg:col-span-3 space-y-5">
          {/* XP Profile Card */}
          <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 text-white">
            <CardContent className="pt-8 pb-6 text-center">
              <Avatar className="h-20 w-20 mx-auto mb-3 border-4 border-white/30 shadow-lg">
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400 text-sm px-3 py-1 shadow-md mb-2">
                🪙 {formatXp(totalXp)} XP
              </Badge>
              <p className="font-bold text-xl mt-2">{userName}</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-2xl font-bold">🪙 {formatXp(totalXp)} XP</span>
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 text-xs">
                  View XP History <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Habits */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400">Today's Habits</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">Show less</Button>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {todayHabits.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No habits configured yet</p>
              )}
              {todayHabits.map((habit) => (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
                    habit.completed ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/50"
                  }`}
                  onClick={() => !habit.completed && completeHabit(habit.id, habit.xp_value)}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    habit.completed
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-muted-foreground/30"
                  }`}>
                    {habit.completed && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${habit.completed ? "line-through text-muted-foreground" : ""}`}>
                      {habit.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {habit.time_of_day || "Anytime"}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs">
                    {habit.xp_value} XP
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
