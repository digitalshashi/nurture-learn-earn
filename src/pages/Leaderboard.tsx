import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
}

function getBadge(xp: number) {
  if (xp >= 100000) return <Badge className="bg-purple-500/20 text-purple-600 border-purple-300 text-[10px]">💎 Diamond</Badge>;
  if (xp >= 50000) return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-300 text-[10px]">🥇 Gold</Badge>;
  if (xp >= 10000) return <Badge className="bg-slate-400/20 text-slate-600 border-slate-300 text-[10px]">🥈 Silver</Badge>;
  if (xp >= 1000) return <Badge className="bg-orange-400/20 text-orange-600 border-orange-300 text-[10px]">🥉 Bronze</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Starter</Badge>;
}

const PAGE_SIZE = 20;

export default function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [filtered, setFiltered] = useState<LeaderEntry[]>([]);
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  useEffect(() => {
    const q = search.toLowerCase();
    const f = q ? entries.filter((e) => e.full_name.toLowerCase().includes(q)) : entries;
    setFiltered(f);
    setPage(1);
  }, [search, entries]);

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
      .sort((a, b) => b.total_xp - a.total_xp);

    setEntries(leaderboard);
    setLoading(false);
  };

  const tabs: { key: TimeFilter; label: string }[] = [
    { key: "day", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "all", label: "All Time" },
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Top 3 for podium
  const top3 = entries.slice(0, 3);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" /> Leaderboard
        </h1>

        {/* Podium */}
        {top3.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2nd place */}
            <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate(`/profile/${top3[1].user_id}`)}>
              <Avatar className="h-14 w-14 border-2 border-slate-400">
                <AvatarFallback className="bg-slate-200 text-slate-700 font-bold text-lg">{top3[1].full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-lg mt-1">🥈</span>
              <p className="text-xs font-semibold truncate max-w-[80px]">{top3[1].full_name}</p>
              <p className="text-xs text-accent font-bold">{formatXP(top3[1].total_xp)} XP</p>
            </div>
            {/* 1st place */}
            <div className="flex flex-col items-center cursor-pointer -mt-4" onClick={() => navigate(`/profile/${top3[0].user_id}`)}>
              <Avatar className="h-18 w-18 border-2 border-yellow-400 h-[72px] w-[72px]">
                <AvatarFallback className="bg-yellow-100 text-yellow-700 font-bold text-xl">{top3[0].full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-2xl mt-1">🥇</span>
              <p className="text-sm font-bold truncate max-w-[100px]">{top3[0].full_name}</p>
              <p className="text-sm text-accent font-bold">{formatXP(top3[0].total_xp)} XP</p>
            </div>
            {/* 3rd place */}
            <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate(`/profile/${top3[2].user_id}`)}>
              <Avatar className="h-14 w-14 border-2 border-orange-400">
                <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-lg">{top3[2].full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-lg mt-1">🥉</span>
              <p className="text-xs font-semibold truncate max-w-[80px]">{top3[2].full_name}</p>
              <p className="text-xs text-accent font-bold">{formatXP(top3[2].total_xp)} XP</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filter === tab.key
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <Card className="card-shadow">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : pageEntries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No results found</div>
            ) : (
              <div>
                {pageEntries.map((entry, idx) => {
                  const rank = (page - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <div
                      key={entry.user_id}
                      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${entry.user_id}`)}
                    >
                      <div className="w-8 flex justify-center shrink-0">
                        {getRankIcon(rank)}
                      </div>
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`text-xs font-semibold ${rank <= 3 ? "bg-accent/20 text-accent" : "bg-secondary"}`}>
                          {entry.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{entry.full_name}</p>
                      </div>
                      <div className="shrink-0">{getBadge(entry.total_xp)}</div>
                      <p className="text-sm font-bold tabular-nums shrink-0 w-24 text-right">
                        {formatXP(entry.total_xp)} <span className="text-xs text-muted-foreground font-normal">XP</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="icon"
                  className={`h-8 w-8 text-xs ${page === p ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
