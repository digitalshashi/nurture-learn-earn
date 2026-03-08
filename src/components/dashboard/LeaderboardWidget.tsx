import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, Crown } from "lucide-react";

interface LeaderEntry {
  user_id: string;
  total_xp: number;
  full_name: string;
  avatar_url: string | null;
}

type TimeFilter = "all" | "month" | "week" | "day";

function formatXP(xp: number): string {
  if (xp >= 100000) return (xp / 100000).toFixed(2) + "L";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return String(xp);
}

function getRankIcon(rank: number) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function LeaderboardWidget() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    let query = supabase.from("xp_transactions").select("user_id, xp_amount");

    const now = new Date();
    if (filter === "day") {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query = query.gte("created_at", dayStart.toISOString());
    } else if (filter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("created_at", weekAgo.toISOString());
    } else if (filter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte("created_at", monthAgo.toISOString());
    }

    const { data: xpData } = await query;

    if (!xpData || xpData.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const userXP: Record<string, number> = {};
    xpData.forEach((t: any) => {
      userXP[t.user_id] = (userXP[t.user_id] || 0) + t.xp_amount;
    });

    const userIds = Object.keys(userXP);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const leaderboard: LeaderEntry[] = userIds
      .map((uid) => ({
        user_id: uid,
        total_xp: userXP[uid],
        full_name: profiles?.find((p) => p.id === uid)?.full_name || "User",
        avatar_url: profiles?.find((p) => p.id === uid)?.avatar_url || null,
      }))
      .sort((a, b) => b.total_xp - a.total_xp)
      .slice(0, 5);

    setEntries(leaderboard);
    setLoading(false);
  };

  const tabs: { key: TimeFilter; label: string }[] = [
    { key: "day", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "all", label: "All Time" },
  ];

  const topPerformer = entries[0];

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" /> Leaderboard
          </CardTitle>
        </div>
        <div className="flex gap-1 mt-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === tab.key
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {topPerformer && (
          <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl p-3 mb-3 flex items-center gap-3 border border-accent/20">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-accent text-accent-foreground text-sm font-bold">
                  {topPerformer.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Crown className="h-4 w-4 text-accent absolute -top-1.5 -right-1" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Top Performer</p>
              <p className="text-sm font-bold">{topPerformer.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-accent">{formatXP(topPerformer.total_xp)}</p>
              <p className="text-[10px] text-muted-foreground">XP</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No XP earned yet</p>
        ) : (
          entries.map((entry, idx) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                idx < 3 ? "bg-secondary/50" : "hover:bg-secondary/30"
              }`}
              onClick={() => navigate(`/profile/${entry.user_id}`)}
            >
              <div className="w-6 flex justify-center shrink-0">
                {getRankIcon(idx + 1)}
              </div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={`text-xs font-semibold ${idx < 3 ? "bg-accent/20 text-accent" : "bg-secondary"}`}>
                  {entry.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.full_name}</p>
              </div>
              <p className="text-sm font-bold tabular-nums">{formatXP(entry.total_xp)} <span className="text-xs text-muted-foreground font-normal">XP</span></p>
            </div>
          ))
        )}

        <Button
          variant="outline"
          className="w-full mt-3 text-xs"
          onClick={() => navigate("/leaderboard")}
        >
          View All
        </Button>
      </CardContent>
    </Card>
  );
}
