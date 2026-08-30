import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  ArrowLeft,
  Headphones,
  Target,
  PenLine,
  ScrollText,
  BookOpen,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest, type RitualRow } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { ProgressRing, QuestCheckRow } from "@/components/quest/QuestPrimitives";
import {
  advanceStreak,
  nextMilestone,
  streakTitle,
  weekCells,
  STREAK_MILESTONES,
} from "@/lib/quest/streak";
import { cn } from "@/lib/utils";

/** Ritual rows carry no icon of their own until a coach sets one. */
const ICON_BY_KEYWORD: [RegExp, LucideIcon][] = [
  [/audio|listen|mindset/i, Headphones],
  [/goal card/i, Target],
  [/write|20 goals/i, PenLine],
  [/affirmation/i, Sparkles],
  [/codex/i, ScrollText],
  [/story|read/i, BookOpen],
  [/comment/i, MessageSquare],
];

const ritualIcon = (ritual: RitualRow): LucideIcon =>
  ICON_BY_KEYWORD.find(([pattern]) => pattern.test(ritual.title))?.[1] ?? Flame;

const GROUPS = [
  { key: "mindset", label: "Mindset" },
  { key: "community", label: "Community" },
];

export default function QuestRituals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quest = useQuest();
  const [busy, setBusy] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<
    { id: string; current_streak: number; full_name: string; avatar_url: string | null }[]
  >([]);

  // Two queries rather than an embed: user_streaks.user_id references
  // auth.users, so PostgREST has no relationship to public.profiles to follow
  // and asking for one comes back empty.
  useEffect(() => {
    let live = true;

    const loadLeaders = async () => {
      const { data: streaks } = await supabase
        .from("user_streaks")
        .select("id, user_id, current_streak")
        .order("current_streak", { ascending: false })
        .limit(8);

      if (!live || !streaks?.length) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", streaks.map((s) => s.user_id));

      if (!live) return;
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      setLeaders(
        streaks.map((s) => ({
          id: s.id,
          current_streak: s.current_streak,
          full_name: byId.get(s.user_id)?.full_name || "Member",
          avatar_url: byId.get(s.user_id)?.avatar_url ?? null,
        })),
      );
    };

    void loadLeaders();
    return () => {
      live = false;
    };
  }, []);

  const { rituals, completedToday, streak } = quest;
  const done = completedToday.size;
  const total = rituals.length;
  const allDone = total > 0 && done === total;

  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const complete = async (ritual: RitualRow) => {
    if (!user || completedToday.has(ritual.id)) return;
    setBusy(ritual.id);

    const { error } = await supabase.from("quest_ritual_completions").insert({
      user_id: user.id,
      ritual_id: ritual.id,
      completed_date: today,
    });

    if (error) {
      setBusy(null);
      // The unique constraint is the source of truth, so a duplicate means
      // another tab got there first rather than something being wrong.
      toast({ title: "Already ticked today", variant: "destructive" });
      void quest.refresh();
      return;
    }

    await supabase.from("xp_transactions").insert({
      user_id: user.id,
      action: "daily_ritual",
      xp_amount: ritual.xp_reward,
      description: `Daily ritual: ${ritual.title}`,
    });

    // The day is only complete when every active ritual is in.
    const finishedTheDay = completedToday.size + 1 === total;
    if (finishedTheDay) await closeOutTheDay();

    setBusy(null);
    await quest.refresh();

    if (!finishedTheDay) toast({ title: `+${ritual.xp_reward} XP` });
  };

  const closeOutTheDay = async () => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_completed_date")
      .eq("user_id", user.id)
      .maybeSingle();

    const result = advanceStreak(existing ?? null, today);
    if (!result.changed) return;

    if (existing) {
      await supabase
        .from("user_streaks")
        .update({
          current_streak: result.current,
          longest_streak: result.longest,
          last_completed_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: result.current,
        longest_streak: result.longest,
        last_completed_date: today,
      });
    }

    if (result.milestone) {
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        action: "streak_bonus",
        xp_amount: result.milestone.xp,
        description: `${result.milestone.name} — ${result.milestone.days}-day streak`,
      });
      toast({
        title: `${result.milestone.name} unlocked`,
        description: `${result.milestone.days} days straight. +${result.milestone.xp} XP.`,
      });
    } else {
      toast({
        title: "Day complete",
        description: `That is ${result.current} day${result.current === 1 ? "" : "s"} in a row.`,
      });
    }
  };

  const upcoming = nextMilestone(streak.current);
  const cells = weekCells(streak.current, new Date(), allDone);

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
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(25_95%_53%/0.12)] text-[hsl(25_95%_45%)]">
          <Flame className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Daily Rituals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Complete your {total} daily practices. All of them, or the day does not count.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Today */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-5">
              <ProgressRing
                value={total ? (done / total) * 100 : 0}
                size={88}
                hue={allDone ? "142 71% 45%" : "25 95% 53%"}
              >
                <div>
                  <p className="font-display text-xl font-bold tabular-nums">
                    {done}/{total}
                  </p>
                  <p className="-mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">today</p>
                </div>
              </ProgressRing>

              <div className="min-w-[160px] flex-1">
                <p className="font-display text-base font-semibold">
                  {allDone ? "Today is done." : "Today's progress"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {allDone
                    ? `Streak is at ${streak.current} day${streak.current === 1 ? "" : "s"}. Come back tomorrow.`
                    : `${total - done} to go before the day counts towards your streak.`}
                </p>

                <div className="mt-3 flex gap-1">
                  {rituals.map((ritual) => (
                    <span
                      key={ritual.id}
                      title={ritual.title}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        completedToday.has(ritual.id) ? "bg-success" : "bg-muted",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* The checklist, grouped. */}
          {GROUPS.map((group) => {
            const items = rituals.filter((r) => (r.category || "mindset") === group.key);
            if (items.length === 0) return null;
            const groupDone = items.filter((r) => completedToday.has(r.id)).length;

            return (
              <section key={group.key}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {groupDone}/{items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((ritual) => (
                    <QuestCheckRow
                      key={ritual.id}
                      icon={ritualIcon(ritual)}
                      title={ritual.title}
                      description={ritual.description ?? undefined}
                      done={completedToday.has(ritual.id)}
                      disabled={busy === ritual.id}
                      onToggle={() => void complete(ritual)}
                      meta={
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          +{ritual.xp_reward}
                        </span>
                      }
                    >
                      {ritual.audio_url && (
                        <div className="mt-2">
                          <audio controls preload="none" src={ritual.audio_url} className="h-8 w-full max-w-sm">
                            <track kind="captions" />
                          </audio>
                          {!completedToday.has(ritual.id) && (
                            <button
                              type="button"
                              onClick={() => void complete(ritual)}
                              className="mt-1 text-[11px] text-muted-foreground underline hover:text-foreground"
                            >
                              Listened elsewhere? Mark as done
                            </button>
                          )}
                        </div>
                      )}

                      {ritual.action_url && (
                        <a
                          href={ritual.action_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                        >
                          {ritual.action_label || "Open"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </QuestCheckRow>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Streak tracker */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {streak.current} day{streak.current === 1 ? "" : "s"}
                </p>
                <p className="text-sm font-medium text-[hsl(25_95%_45%)]">{streakTitle(streak.current)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {upcoming
                    ? `Next: ${upcoming.name} — ${upcoming.days - streak.current} day${upcoming.days - streak.current === 1 ? "" : "s"} to go`
                    : "Every milestone cleared."}
                </p>
              </div>

              <div className="flex gap-1.5">
                {cells.map((cell, index) => (
                  <div
                    key={index}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg border-2 text-[11px] font-semibold transition-colors",
                      cell.filled
                        ? "border-[hsl(25_95%_53%)] bg-[hsl(25_95%_53%)] text-white"
                        : "border-border bg-muted/30 text-muted-foreground",
                      cell.isToday && !cell.filled && "border-accent text-accent",
                    )}
                  >
                    {cell.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {STREAK_MILESTONES.map((milestone) => {
                const held = streak.longest >= milestone.days;
                return (
                  <span
                    key={milestone.days}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      held
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {milestone.days}d · {milestone.name} · +{milestone.xp} XP
                  </span>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Best run: <span className="font-semibold text-foreground">{streak.longest} days</span>
            </p>
          </section>
        </div>

        {/* Streak leaders */}
        <aside className="lg:col-span-1">
          <section className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-[76px]">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
              <Crown className="h-4 w-4 text-accent" />
              Streak leaders
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Longest runs going right now.</p>

            <div className="mt-3 space-y-1">
              {leaders.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No streaks yet. Be the first.
                </p>
              ) : (
                leaders.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                      index === 0 && "bg-accent/[0.07]",
                    )}
                  >
                    <span className="w-5 shrink-0 text-center text-sm">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (
                        <span className="text-xs font-semibold text-muted-foreground">{index + 1}</span>
                      )}
                    </span>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={entry.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">
                        {entry.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {entry.full_name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums">
                      <Flame className="h-3.5 w-3.5 text-[hsl(25_95%_53%)]" />
                      {entry.current_streak}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
