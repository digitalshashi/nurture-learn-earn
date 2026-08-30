import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Search, Eye, Loader2, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { LockedPanel } from "@/components/quest/QuestPrimitives";
import { StoryReader, type StoryCard } from "@/components/quest/StoryReader";
import { cn } from "@/lib/utils";

interface Achiever {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  niche: string | null;
  xp: number;
  streak: number;
  stories: number;
}

type Filter = "all" | "storytellers" | "streakers";

/**
 * The public record: who is ahead, and on what.
 *
 * Two boards rather than one, because "most XP" and "most read" reward
 * different behaviour and collapsing them into a single number would let
 * activity stand in for usefulness.
 */
export default function QuestLeaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quest = useQuest();

  const [achievers, setAchievers] = useState<Achiever[]>([]);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [reading, setReading] = useState<StoryCard | null>(null);

  const load = useCallback(async () => {
    const [xp, streaks, published] = await Promise.all([
      supabase.from("xp_transactions").select("user_id, xp_amount"),
      supabase.from("user_streaks").select("user_id, current_streak"),
      supabase
        .from("quest_stories")
        .select("id, user_id, title, excerpt, body, cover_url, view_count, published_at")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(50),
    ]);

    const totals = new Map<string, number>();
    for (const row of xp.data ?? []) {
      totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.xp_amount || 0));
    }

    const streakBy = new Map((streaks.data ?? []).map((s) => [s.user_id, s.current_streak]));
    const storiesBy = new Map<string, number>();
    for (const story of published.data ?? []) {
      storiesBy.set(story.user_id, (storiesBy.get(story.user_id) ?? 0) + 1);
    }

    // Everyone who shows up on any of the three boards, so a member with a
    // long streak and no XP is still in the directory.
    const ids = [...new Set([...totals.keys(), ...streakBy.keys(), ...storiesBy.keys()])];
    if (ids.length === 0) {
      setAchievers([]);
      setStories([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, niche")
      .in("id", ids);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    setAchievers(
      ids
        .map((id) => ({
          user_id: id,
          full_name: byId.get(id)?.full_name || "Member",
          avatar_url: byId.get(id)?.avatar_url ?? null,
          niche: byId.get(id)?.niche ?? null,
          xp: totals.get(id) ?? 0,
          streak: streakBy.get(id) ?? 0,
          stories: storiesBy.get(id) ?? 0,
        }))
        .sort((a, b) => b.xp - a.xp),
    );

    setStories(
      (published.data ?? []).map((story) => ({
        ...story,
        author: byId.get(story.user_id)
          ? {
              full_name: byId.get(story.user_id)!.full_name,
              avatar_url: byId.get(story.user_id)!.avatar_url,
            }
          : null,
      })) as StoryCard[],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!quest.gate.unlocked) {
    return (
      <LockedPanel
        title="The leaderboard opens after setup"
        description="It is a directory of members, and you are not in it until your profile says who you are."
        action={<Button size="sm" onClick={() => navigate("/quest")}>Back to the gate</Button>}
      />
    );
  }

  const query = search.trim().toLowerCase();
  const visible = achievers
    .filter((a) =>
      filter === "storytellers" ? a.stories > 0 : filter === "streakers" ? a.streak > 0 : true,
    )
    .filter(
      (a) =>
        !query ||
        a.full_name.toLowerCase().includes(query) ||
        (a.niche ?? "").toLowerCase().includes(query),
    );

  const totalViews = stories.reduce((sum, s) => sum + s.view_count, 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/quest")}
        className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Quest
      </button>

      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Leaderboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Achievers and community rankings.</p>
        </div>
      </header>

      {/* Community impact */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members ranked" value={achievers.length} />
        <Stat label="On a streak" value={achievers.filter((a) => a.streak > 0).length} />
        <Stat label="Stories published" value={stories.length} />
        <Stat label="Total story views" value={totalViews} />
      </div>

      <Tabs defaultValue="achievers">
        <TabsList className="mb-4">
          <TabsTrigger value="achievers">Achievers</TabsTrigger>
          <TabsTrigger value="stories">Stories</TabsTrigger>
        </TabsList>

        <TabsContent value="achievers">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(
              [
                { key: "all", label: "All achievers", count: achievers.length },
                {
                  key: "storytellers",
                  label: "Storytellers",
                  count: achievers.filter((a) => a.stories > 0).length,
                },
                {
                  key: "streakers",
                  label: "On a streak",
                  count: achievers.filter((a) => a.streak > 0).length,
                },
              ] as const
            ).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === chip.key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {chip.label} ({chip.count})
              </button>
            ))}

            <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or niche…"
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nobody matches that.</p>
          ) : (
            <div className="space-y-1">
              {visible.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    entry.user_id === user?.id
                      ? "border-accent/30 bg-accent/[0.06]"
                      : "border-border bg-card",
                  )}
                >
                  <span className="w-6 shrink-0 text-center">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </span>

                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={entry.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-[10px]">
                      {entry.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {entry.full_name}
                      {entry.user_id === user?.id && (
                        <span className="rounded bg-accent px-1 py-px text-[9px] font-bold text-accent-foreground">
                          YOU
                        </span>
                      )}
                    </p>
                    {entry.niche && (
                      <p className="truncate text-[11px] text-muted-foreground">{entry.niche}</p>
                    )}
                  </div>

                  {entry.streak > 0 && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground sm:flex">
                      <Flame className="h-3.5 w-3.5 text-[hsl(25_95%_53%)]" />
                      {entry.streak}
                    </span>
                  )}
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {entry.xp.toLocaleString()}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">XP</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stories">
          {stories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing published yet. Yours could be the first.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {stories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => setReading(story)}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/40"
                >
                  {story.cover_url && (
                    <img
                      src={story.cover_url}
                      alt=""
                      className="mb-3 h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="text-sm font-semibold leading-snug">{story.title}</p>
                  <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {story.excerpt || story.body.slice(0, 140)}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={story.author?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-[8px]">
                        {(story.author?.full_name ?? "M").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{story.author?.full_name ?? "Member"}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {story.view_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {reading && (
        <StoryReader
          story={reading}
          onClose={() => setReading(null)}
          onCommented={() => {
            void quest.refresh();
            void load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="font-display text-xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
