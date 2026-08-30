import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  gateState,
  handbookState,
  momentumMeter,
  profileState,
  toolChainState,
  type GateState,
  type HandbookState,
  type MomentumState,
  type ProfileState,
  type ToolChainState,
  type ToolRun,
} from "@/lib/quest/progress";
import { awardLadder, currentAwardLevel, type AwardRow, type QuestAward } from "@/lib/quest/awards";
import type { SocialMap } from "@/lib/quest/socials";

/**
 * Everything the Quest section knows about the signed-in member, loaded once.
 *
 * The gate percentage appears in four places at the same time — the sidebar
 * card, the gate cards, the command centre and the award ladder — and every
 * screen inside Quest needs some slice of the same handful of tables. Loading
 * it per page meant the sidebar and the page it framed could disagree about
 * how far along somebody was, which is exactly the sort of thing that makes a
 * progress bar stop being believed.
 */

export interface QuestProfileRow {
  user_id: string;
  phone: string | null;
  city: string | null;
  join_date: string | null;
  membership_level: string;
  achievement_level: string;
  membership_synced_at: string | null;
  designation: string | null;
  community_name: string | null;
  socials: SocialMap;
}

export interface RitualRow {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  sort_order: number;
  category: string;
  audio_url: string | null;
  action_url: string | null;
  action_label: string | null;
}

interface QuestValue {
  loading: boolean;
  /** Set when the Quest tables are not reachable — usually a pending migration. */
  degraded: boolean;
  refresh: () => Promise<void>;

  displayName: string;
  firstName: string;
  avatarUrl: string | null;
  questProfile: QuestProfileRow | null;

  handbookRead: Set<string>;
  rituals: RitualRow[];
  completedToday: Set<string>;
  streak: { current: number; longest: number };
  toolRuns: ToolRun[];
  totalXp: number;
  storiesPublished: number;
  storiesDraft: number;
  commentsLeft: number;
  applications: Record<string, "pending" | "approved" | "rejected">;

  profile: ProfileState;
  handbook: HandbookState;
  gate: GateState;
  tools: ToolChainState;
  momentum: MomentumState;
  awards: AwardRow[];
  awardLevel: QuestAward | null;
}

const QuestContext = createContext<QuestValue | undefined>(undefined);

/** Table reads degrade to empty rather than throwing: see `degraded`. */
async function safeRows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<{
  rows: T[];
  failed: boolean;
}> {
  const { data, error } = await query;
  return { rows: data ?? [], failed: !!error };
}

export function QuestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);

  const [baseProfile, setBaseProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [questProfile, setQuestProfile] = useState<QuestProfileRow | null>(null);
  const [handbookRead, setHandbookRead] = useState<Set<string>>(new Set());
  const [rituals, setRituals] = useState<RitualRow[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [storyCounts, setStoryCounts] = useState({ published: 0, draft: 0 });
  const [commentsLeft, setCommentsLeft] = useState(0);
  const [applications, setApplications] = useState<Record<string, "pending" | "approved" | "rejected">>({});

  // Local midnight, not UTC: a ritual ticked at 11pm belongs to that evening.
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [
      base,
      quest,
      handbook,
      ritualRows,
      completions,
      streakRow,
      runs,
      xp,
      stories,
      comments,
      apps,
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("quest_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      safeRows(supabase.from("quest_handbook_progress").select("section_key").eq("user_id", user.id)),
      safeRows(supabase.from("quest_daily_rituals").select("*").eq("is_active", true).order("sort_order")),
      safeRows(
        supabase
          .from("quest_ritual_completions")
          .select("ritual_id")
          .eq("user_id", user.id)
          .eq("completed_date", today),
      ),
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      safeRows(supabase.from("quest_power_tool_runs").select("*").eq("user_id", user.id)),
      safeRows(supabase.from("xp_transactions").select("xp_amount").eq("user_id", user.id)),
      safeRows(supabase.from("quest_stories").select("id, status").eq("user_id", user.id)),
      supabase
        .from("quest_story_comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      safeRows(supabase.from("quest_award_applications").select("award_key, status").eq("user_id", user.id)),
    ]);

    setBaseProfile(base.data ?? null);
    setQuestProfile(
      quest.data
        ? { ...quest.data, socials: (quest.data.socials as SocialMap) ?? {} }
        : null,
    );
    setHandbookRead(new Set(handbook.rows.map((r) => r.section_key)));
    setRituals(ritualRows.rows as RitualRow[]);
    setCompletedToday(new Set(completions.rows.map((r) => r.ritual_id)));
    setStreak({
      current: streakRow.data?.current_streak ?? 0,
      longest: streakRow.data?.longest_streak ?? 0,
    });
    setToolRuns(runs.rows as ToolRun[]);
    setTotalXp(xp.rows.reduce((sum, t) => sum + (t.xp_amount || 0), 0));
    setStoryCounts({
      published: stories.rows.filter((s) => s.status === "published").length,
      draft: stories.rows.filter((s) => s.status !== "published").length,
    });
    setCommentsLeft(comments.count ?? 0);
    setApplications(
      Object.fromEntries(
        apps.rows.map((a) => [a.award_key, a.status as "pending" | "approved" | "rejected"]),
      ),
    );

    // The rituals table predates this module, so its absence is a real outage
    // rather than an unapplied migration; the new tables are what tell us the
    // module has not been deployed to the database yet.
    setDegraded(handbook.failed || runs.failed || !!quest.error);
    setLoading(false);
  }, [user, today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<QuestValue>(() => {
    const profile = profileState({
      fullName: baseProfile?.full_name,
      avatarUrl: baseProfile?.avatar_url,
      city: questProfile?.city,
      designation: questProfile?.designation,
      communityName: questProfile?.community_name,
      socials: questProfile?.socials,
    });
    const handbook = handbookState(handbookRead);
    const gate = gateState(profile, handbook);
    const tools = toolChainState(toolRuns);
    const momentum = momentumMeter({
      gate,
      currentStreak: streak.current,
      potency: tools.potency,
      storiesPublished: storyCounts.published,
      commentsLeft,
    });
    const awards = awardLadder(
      {
        gateComplete: gate.unlocked,
        longestStreak: streak.longest,
        storiesPublished: storyCounts.published,
        toolsComplete: tools.complete,
        totalTools: tools.total,
      },
      applications,
    );

    const displayName = baseProfile?.full_name?.trim() || user?.email?.split("@")[0] || "Member";

    return {
      loading,
      degraded,
      refresh,
      displayName,
      firstName: displayName.split(" ")[0],
      avatarUrl: baseProfile?.avatar_url ?? null,
      questProfile,
      handbookRead,
      rituals,
      completedToday,
      streak,
      toolRuns,
      totalXp,
      storiesPublished: storyCounts.published,
      storiesDraft: storyCounts.draft,
      commentsLeft,
      applications,
      profile,
      handbook,
      gate,
      tools,
      momentum,
      awards,
      awardLevel: currentAwardLevel(awards),
    };
  }, [
    loading,
    degraded,
    refresh,
    baseProfile,
    questProfile,
    handbookRead,
    rituals,
    completedToday,
    streak,
    toolRuns,
    totalXp,
    storyCounts,
    commentsLeft,
    applications,
    user,
  ]);

  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
}

export function useQuest(): QuestValue {
  const value = useContext(QuestContext);
  if (!value) throw new Error("useQuest must be used inside a QuestProvider");
  return value;
}
