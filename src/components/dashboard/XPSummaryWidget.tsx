import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, Award, Target } from "lucide-react";

export default function XPSummaryWidget() {
  const { user } = useAuth();
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextLevelXP, setNextLevelXP] = useState(200);
  const [currentLevelXP, setCurrentLevelXP] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [weeklyXP, setWeeklyXP] = useState(0);

  useEffect(() => {
    if (user) loadXPData();
  }, [user]);

  const loadXPData = async () => {
    if (!user) return;

    // Get total XP
    const { data: xpData } = await supabase
      .from("xp_transactions")
      .select("xp_amount")
      .eq("user_id", user.id);
    
    const total = xpData?.reduce((sum, t) => sum + t.xp_amount, 0) || 0;
    setTotalXP(total);

    // Weekly XP
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekData } = await supabase
      .from("xp_transactions")
      .select("xp_amount")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString());
    setWeeklyXP(weekData?.reduce((sum, t) => sum + t.xp_amount, 0) || 0);

    // Determine level from level_definitions
    const { data: levels } = await supabase
      .from("level_definitions")
      .select("*")
      .order("xp_required");
    
    if (levels && levels.length > 0) {
      let currentLevel = levels[0];
      let nextLevel = levels.length > 1 ? levels[1] : null;
      for (let i = 0; i < levels.length; i++) {
        if (total >= levels[i].xp_required) {
          currentLevel = levels[i];
          nextLevel = i + 1 < levels.length ? levels[i + 1] : null;
        }
      }
      setLevel(currentLevel.level_number);
      setCurrentLevelXP(currentLevel.xp_required);
      setNextLevelXP(nextLevel?.xp_required || currentLevel.xp_required + 1000);
    }

    // Calculate rank (how many users have more XP)
    const { data: allXP } = await supabase.from("xp_transactions").select("user_id, xp_amount");
    if (allXP) {
      const userTotals: Record<string, number> = {};
      allXP.forEach((t) => { userTotals[t.user_id] = (userTotals[t.user_id] || 0) + t.xp_amount; });
      const sorted = Object.entries(userTotals).sort(([, a], [, b]) => b - a);
      const myRank = sorted.findIndex(([uid]) => uid === user.id);
      setRank(myRank >= 0 ? myRank + 1 : null);
    }
  };

  const progress = nextLevelXP > currentLevelXP
    ? Math.min(100, ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
    : 100;

  function formatXP(xp: number): string {
    if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
    return String(xp);
  }

  return (
    <Card className="card-shadow overflow-hidden">
      <div className="bg-gradient-to-br from-accent/15 via-accent/5 to-transparent p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
            <Zap className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatXP(totalXP)} <span className="text-sm font-normal text-muted-foreground">XP</span></p>
            <p className="text-xs text-muted-foreground">Level {level}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Level {level}</span>
            <span>Level {level + 1}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-right">
            {formatXP(nextLevelXP - totalXP)} XP to next level
          </p>
        </div>
      </div>
      <CardContent className="pt-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-1">
              <Award className="h-4 w-4 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">Rank</p>
            <p className="text-sm font-bold">{rank ? `#${rank}` : "-"}</p>
          </div>
          <div className="text-center">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-1">
              <Target className="h-4 w-4 text-success" />
            </div>
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="text-sm font-bold">{level}</p>
          </div>
          <div className="text-center">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-1">
              <TrendingUp className="h-4 w-4 text-info" />
            </div>
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-sm font-bold">+{formatXP(weeklyXP)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
