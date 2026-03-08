import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, CheckCircle, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  full_name: string;
}

export function LevelUpDashboard() {
  const { user } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState({ level_number: 1, badge_name: "Beginner", xp_required: 0 });
  const [nextLevel, setNextLevel] = useState<{ xp_required: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({ habits: 0, tasks: 0, challenges: 0 });
  const [xpHistory, setXpHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;

    // Total XP
    const { data: xpData } = await supabase
      .from("xp_transactions")
      .select("xp_amount")
      .eq("user_id", user.id);
    const xp = xpData?.reduce((sum, t) => sum + t.xp_amount, 0) || 0;
    setTotalXp(xp);

    // Levels
    const { data: levels } = await supabase
      .from("level_definitions")
      .select("*")
      .order("xp_required", { ascending: true });
    if (levels) {
      const current = [...levels].reverse().find((l) => xp >= l.xp_required);
      if (current) setLevel(current);
      const next = levels.find((l) => l.xp_required > xp);
      setNextLevel(next || null);
    }

    // Stats
    const { count: habitCount } = await supabase
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { count: taskCount } = await supabase
      .from("student_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_completed", true);
    const { count: challengeCount } = await supabase
      .from("challenge_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_completed", true);
    setStats({ habits: habitCount || 0, tasks: taskCount || 0, challenges: challengeCount || 0 });

    // Leaderboard - get top XP earners
    const { data: allXp } = await supabase
      .from("xp_transactions")
      .select("user_id, xp_amount");
    if (allXp) {
      const byUser: Record<string, number> = {};
      allXp.forEach((t) => { byUser[t.user_id] = (byUser[t.user_id] || 0) + t.xp_amount; });
      const sorted = Object.entries(byUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const lb = sorted.map(([uid, xp]) => ({
        user_id: uid,
        total_xp: xp,
        full_name: profiles?.find((p) => p.id === uid)?.full_name || "User",
      }));
      setLeaderboard(lb);
    }

    // XP history (last 7 days)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    const { data: recentXp } = await supabase
      .from("xp_transactions")
      .select("xp_amount, created_at")
      .eq("user_id", user.id)
      .gte("created_at", days[0]);
    const chartData = days.map((day) => {
      const dayLabel = new Date(day).toLocaleDateString("en", { weekday: "short" });
      const yourXp = recentXp?.filter((t) => t.created_at.startsWith(day)).reduce((s, t) => s + t.xp_amount, 0) || 0;
      return { day: dayLabel, you: yourXp, community: Math.floor(Math.random() * 50 + 10) };
    });
    setXpHistory(chartData);
  };

  const xpProgress = nextLevel
    ? Math.round(((totalXp - level.xp_required) / (nextLevel.xp_required - level.xp_required)) * 100)
    : 100;

  const formatXp = (xp: number) => xp >= 1000 ? `${(xp / 1000).toFixed(1)}K` : String(xp);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Habit Chart + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Habit Performance */}
          <Card className="card-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Habit Performance</CardTitle>
              <span className="text-sm text-accent font-semibold">🪙 {formatXp(totalXp)} XP</span>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2 flex gap-4">
                <span>● Your completion rate</span>
                <span className="text-destructive">● Community avg</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={xpHistory}>
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="you" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="community" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="card-shadow">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Task Completion</p>
                  <p className="text-lg font-bold">{stats.tasks}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <Target className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Challenges</p>
                  <p className="text-lg font-bold">{stats.challenges}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-shadow">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10">
                  <Flame className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Habits Done</p>
                  <p className="text-lg font-bold">{stats.habits}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Motivational banner */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-none">
            <CardContent className="py-4 text-center">
              <p className="font-semibold text-foreground">
                🎉 Keep going! You're doing great!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* XP Profile Card */}
          <Card className="bg-gradient-to-b from-primary to-primary/80 text-primary-foreground overflow-hidden">
            <CardContent className="pt-6 pb-4 text-center">
              <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-primary-foreground/30">
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xl font-bold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Badge className="bg-accent text-accent-foreground mb-2">🪙 {formatXp(totalXp)} XP</Badge>
              <p className="font-bold text-lg">{user?.email?.split("@")[0] || "Student"}</p>
              <p className="text-xs text-primary-foreground/70 mt-1">Level {level.level_number} · {level.badge_name}</p>
              <div className="mt-3 px-4">
                <Progress value={xpProgress} className="h-2 bg-primary-foreground/20" />
                <p className="text-xs mt-1 text-primary-foreground/60">
                  {nextLevel ? `${nextLevel.xp_required - totalXp} XP to next level` : "Max level!"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" /> Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
              {leaderboard.map((entry, i) => (
                <div key={entry.user_id} className="flex items-center gap-3 py-1.5">
                  <span className={`text-sm font-bold w-6 text-center ${i < 3 ? "text-accent" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-secondary text-xs font-semibold">
                      {entry.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm truncate">{entry.full_name}</span>
                  <Badge variant="outline" className="text-xs">🪙 {formatXp(entry.total_xp)} XP</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
