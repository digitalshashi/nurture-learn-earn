import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Trophy, Flame, Star, Zap, CheckCircle2, Lock,
  Crown, Target, Medal, BookOpen, ArrowRight,
} from "lucide-react";

interface Ritual {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  sort_order: number;
}

interface LevelDef {
  id: string;
  level_number: number;
  xp_required: number;
  badge_name: string | null;
}

const LEVEL_ICONS = [Star, Zap, Trophy, Crown, Medal, Target, Flame, Star, Crown, Trophy];
const LEVEL_COLORS = [
  "hsl(var(--muted-foreground))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(25 95% 53%)",
  "hsl(280 70% 55%)",
  "hsl(45 93% 47%)",
  "hsl(0 72% 51%)",
  "hsl(200 80% 50%)",
  "hsl(280 70% 55%)",
  "hsl(45 93% 47%)",
];

export default function QuestDashboard() {
  const { user } = useAuth();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [levels, setLevels] = useState<LevelDef[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [streakLeaderboard, setStreakLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [ritualsRes, completionsRes, levelsRes, xpRes, streakRes, lbRes] = await Promise.all([
      supabase.from("quest_daily_rituals").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("quest_ritual_completions").select("ritual_id").eq("user_id", user.id).eq("completed_date", today),
      supabase.from("level_definitions").select("*").order("level_number"),
      supabase.from("xp_transactions").select("xp_amount").eq("user_id", user.id),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_streaks").select("*, profiles:user_id(full_name)").order("current_streak", { ascending: false }).limit(10),
    ]);

    setRituals((ritualsRes.data as Ritual[]) || []);
    setCompletedToday(new Set((completionsRes.data || []).map((c: any) => c.ritual_id)));
    setLevels((levelsRes.data as LevelDef[]) || []);
    setTotalXp((xpRes.data || []).reduce((sum: number, t: any) => sum + (t.xp_amount || 0), 0));
    if (streakRes.data) {
      setStreak({ current: streakRes.data.current_streak, longest: streakRes.data.longest_streak });
    }
    setStreakLeaderboard(lbRes.data || []);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const completeRitual = async (ritualId: string, xpReward: number) => {
    if (!user || completedToday.has(ritualId)) return;

    // Insert completion
    const { error } = await supabase.from("quest_ritual_completions").insert({
      user_id: user.id,
      ritual_id: ritualId,
      completed_date: today,
    });
    if (error) { toast({ title: "Already completed", variant: "destructive" }); return; }

    // Award XP
    await supabase.from("xp_transactions").insert({
      user_id: user.id,
      action: "daily_ritual",
      xp_amount: xpReward,
      description: "Daily ritual completed",
    });

    // Check if all rituals done today → update streak
    const newCompleted = new Set(completedToday);
    newCompleted.add(ritualId);

    if (newCompleted.size === rituals.length) {
      // All rituals done! Update streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data: existing } = await supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle();

      if (existing) {
        const wasYesterday = existing.last_completed_date === yesterdayStr;
        const newStreak = wasYesterday ? existing.current_streak + 1 : 1;
        const newLongest = Math.max(newStreak, existing.longest_streak);
        await supabase.from("user_streaks").update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_completed_date: today,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);

        // Streak bonus XP
        if (newStreak === 7) {
          await supabase.from("xp_transactions").insert({ user_id: user.id, action: "streak_bonus", xp_amount: 50, description: "7-day streak bonus!" });
          toast({ title: "🔥 7-Day Streak Bonus! +50 XP" });
        } else if (newStreak === 30) {
          await supabase.from("xp_transactions").insert({ user_id: user.id, action: "streak_bonus", xp_amount: 200, description: "30-day streak bonus!" });
          toast({ title: "🏆 30-Day Streak! +200 XP" });
        }
      } else {
        await supabase.from("user_streaks").insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today,
        });
      }
      toast({ title: "🎉 All rituals complete! Streak updated!" });
    } else {
      toast({ title: `+${xpReward} XP earned!` });
    }

    loadData();
  };

  // Calculate current level
  const currentLevel = levels.reduce((acc, l) => (totalXp >= l.xp_required ? l : acc), levels[0]);
  const currentLevelIdx = levels.findIndex(l => l.id === currentLevel?.id);
  const nextLevel = levels[currentLevelIdx + 1];
  const xpForNext = nextLevel ? nextLevel.xp_required - totalXp : 0;
  const progressPercent = nextLevel
    ? ((totalXp - (currentLevel?.xp_required || 0)) / ((nextLevel?.xp_required || 1) - (currentLevel?.xp_required || 0))) * 100
    : 100;

  const completedCount = completedToday.size;
  const totalRituals = rituals.length;
  const ritualProgress = totalRituals > 0 ? (completedCount / totalRituals) * 100 : 0;

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "Champion";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading your quest...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display">Welcome back, {userName}! 👋</h1>
          <p className="text-muted-foreground text-sm">Complete your daily rituals to build momentum and level up.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-shadow border-l-4 border-l-primary">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalXp.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow border-l-4 border-l-accent">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold">Lv. {currentLevel?.level_number || 1}</p>
                  <p className="text-xs text-muted-foreground">{currentLevel?.badge_name || "Starter"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow border-l-4" style={{ borderLeftColor: "hsl(25 95% 53%)" }}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5" style={{ color: "hsl(25 95% 53%)" }} />
                <div>
                  <p className="text-2xl font-bold">{streak.current}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow border-l-4 border-l-secondary">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary-foreground" />
                <div>
                  <p className="text-2xl font-bold">{completedCount}/{totalRituals}</p>
                  <p className="text-xs text-muted-foreground">Today's Rituals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Journey */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" />Achievement Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {levels.map((level, i) => {
                const unlocked = totalXp >= level.xp_required;
                const isCurrent = level.id === currentLevel?.id;
                const Icon = LEVEL_ICONS[i % LEVEL_ICONS.length];
                return (
                  <div key={level.id} className="flex items-center shrink-0">
                    <div className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${isCurrent ? "bg-primary/10 scale-105" : ""}`}>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          unlocked ? "border-primary bg-primary/10" : "border-muted bg-muted/30"
                        } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                      >
                        {unlocked ? (
                          <Icon className="h-5 w-5 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium text-center leading-tight max-w-[60px] ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                        {level.badge_name}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{level.xp_required.toLocaleString()} XP</span>
                    </div>
                    {i < levels.length - 1 && (
                      <div className={`w-6 h-0.5 ${totalXp >= levels[i + 1].xp_required ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {nextLevel && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Next: <strong className="text-foreground">{nextLevel.badge_name}</strong></span>
                  <span className="text-muted-foreground">{xpForNext.toLocaleString()} XP to go</span>
                </div>
                <Progress value={Math.min(progressPercent, 100)} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Daily Rituals + Streak */}
          <div className="md:col-span-2 space-y-6">
            {/* Daily Rituals */}
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Daily Rituals</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">6 habits that build champions</p>
                  </div>
                  <Badge variant={completedCount === totalRituals ? "default" : "outline"}>
                    {completedCount}/{totalRituals}
                  </Badge>
                </div>
                <Progress value={ritualProgress} className="h-1.5 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                {rituals.map(r => {
                  const done = completedToday.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        done ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-border"
                      }`}
                      onClick={() => !done && completeRitual(r.id, r.xp_reward)}
                    >
                      <Checkbox checked={done} disabled={done} className="pointer-events-none" />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">+{r.xp_reward} XP</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Streak Tracker */}
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4" style={{ color: "hsl(25 95% 53%)" }} />
                  Building Momentum
                </CardTitle>
                <p className="text-xs text-muted-foreground">{streak.current > 0 ? `${streak.current} Day Streak 🔥` : "Complete all rituals to start a streak!"}</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 7 }, (_, i) => {
                    const filled = i < (streak.current % 7 || (streak.current > 0 ? 7 : 0));
                    return (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          filled
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span>Current: <strong className="text-foreground">{streak.current} days</strong></span>
                  <span>Best: <strong className="text-foreground">{streak.longest} days</strong></span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={streak.current >= 7 ? "default" : "outline"} className="text-[10px]">7 Days</Badge>
                    <span className="text-muted-foreground">+50 XP Bonus</span>
                    {streak.current >= 7 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={streak.current >= 30 ? "default" : "outline"} className="text-[10px]">30 Days</Badge>
                    <span className="text-muted-foreground">+200 XP + Consistency Badge</span>
                    {streak.current >= 30 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={streak.current >= 90 ? "default" : "outline"} className="text-[10px]">90 Days</Badge>
                    <span className="text-muted-foreground">+500 XP + Champion Badge</span>
                    {streak.current >= 90 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* XP Breakdown */}
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />How to Earn XP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { action: "Daily Ritual", xp: 10 },
                    { action: "Read a Story", xp: 5 },
                    { action: "Leave a Comment", xp: 5 },
                    { action: "Post Content", xp: 15 },
                    { action: "Complete Course", xp: 200 },
                    { action: "7-Day Streak", xp: 50 },
                    { action: "Attend Event", xp: 50 },
                    { action: "Complete Task", xp: 20 },
                  ].map(item => (
                    <div key={item.action} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30">
                      <span className="text-xs">{item.action}</span>
                      <Badge variant="secondary" className="text-[10px]">+{item.xp}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Leaderboard + Next Step */}
          <div className="space-y-6">
            {/* Streak Leaderboard */}
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Crown className="h-4 w-4 text-accent" />Streak Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {streakLeaderboard.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No streaks yet. Be the first!</p>
                ) : streakLeaderboard.map((entry: any, i: number) => (
                  <div key={entry.id} className={`flex items-center gap-2 py-2 px-2 rounded-lg ${i === 0 ? "bg-accent/10" : ""}`}>
                    <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-accent" : i === 1 ? "text-muted-foreground" : "text-muted-foreground"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.profiles?.full_name || "User"}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Flame className="h-3.5 w-3.5" style={{ color: "hsl(25 95% 53%)" }} />
                      <span className="font-bold">{entry.current_streak}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Next Step */}
            <Card className="card-shadow bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Continue Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Complete courses to earn massive XP and unlock higher levels.</p>
                <Button size="sm" className="w-full" onClick={() => window.location.href = "/courses"}>
                  Browse Courses <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Current Badges */}
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Medal className="h-4 w-4 text-primary" />Your Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {levels.filter(l => totalXp >= l.xp_required).map(l => (
                    <Badge key={l.id} variant="secondary" className="text-xs py-1 px-2">
                      ⭐ {l.badge_name}
                    </Badge>
                  ))}
                  {levels.filter(l => totalXp >= l.xp_required).length === 0 && (
                    <p className="text-xs text-muted-foreground">Complete rituals to earn your first badge!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
