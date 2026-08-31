import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LeaderEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  points: number;
}

const rankColors = ["bg-amber-400", "bg-gray-400", "bg-amber-700"];

function formatPoints(n: number): string {
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export function FeedSidebar() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"day" | "month">("month");
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase.from("xp_transactions").select("user_id, xp_amount");
      if (range === "day") {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        query = query.gte("created_at", dayStart.toISOString());
      } else {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte("created_at", monthAgo.toISOString());
      }

      const { data: xpData } = await query;
      if (cancelled) return;

      if (!xpData || xpData.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const totals: Record<string, number> = {};
      xpData.forEach((t: any) => {
        totals[t.user_id] = (totals[t.user_id] || 0) + t.xp_amount;
      });

      const topIds = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", topIds);

      if (cancelled) return;

      const ranked: LeaderEntry[] = topIds.map((id) => ({
        user_id: id,
        points: totals[id],
        full_name: profiles?.find((p) => p.id === id)?.full_name || "Member",
        avatar_url: profiles?.find((p) => p.id === id)?.avatar_url || null,
      }));

      setEntries(ranked);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="space-y-4">
      {/* Trust Quotient */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent text-lg">🔥</span>
          <h3 className="font-semibold text-base">Introducing Trust Quotient (TQ)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Complete your profile to unlock your trust score
        </p>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/my-account")}>
          Complete profile
        </Button>
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base">Leaderboard</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setRange("month")}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full",
                range === "month" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              Month
            </button>
            <button
              onClick={() => setRange("day")}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full",
                range === "day" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              Day
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-7 rounded bg-muted animate-pulse" />)
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No activity {range === "day" ? "today" : "this month"} yet.
            </p>
          ) : (
            entries.map((user, i) => (
              <button
                key={user.user_id}
                onClick={() => navigate(`/profile/${user.user_id}`)}
                className="flex items-center gap-2 w-full text-left hover:bg-secondary/50 rounded-md p-1 -m-1 transition-colors"
              >
                <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                <Avatar className="h-7 w-7">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} />}
                  <AvatarFallback className={`${i < 3 ? rankColors[i] : "bg-secondary"} text-[10px] font-semibold ${i < 3 ? "text-card" : "text-foreground"}`}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs flex-1 truncate">{user.full_name}</span>
                <span className="text-xs font-semibold text-accent flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {formatPoints(user.points)}
                </span>
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => navigate("/leaderboard")}
          className="w-full mt-2 text-sm text-link hover:underline text-center"
        >
          See all
        </button>
      </div>
    </div>
  );
}
