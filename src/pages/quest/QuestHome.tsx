import { useNavigate } from "react-router-dom";
import { ArrowRight, UserRound, BookOpen, Flame, Sparkles, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQuest } from "@/contexts/QuestContext";
import { QUEST_NAV, isGroup, type QuestNavItem } from "@/lib/quest/nav";
import { DoThisNext, ProgressRing, StatusPill } from "@/components/quest/QuestPrimitives";
import { cn } from "@/lib/utils";

/**
 * Quest Home, which is two different screens depending on one boolean.
 *
 * Before the gate: exactly two things to do and nothing else on the page. The
 * temptation is to show a preview of what is coming, and it is the wrong call
 * — a dashboard full of tools somebody has no context for is the reason they
 * bounce on day one.
 */
export default function QuestHome() {
  const quest = useQuest();
  return quest.gate.unlocked ? <CommandCentre /> : <GateScreen />;
}

// ------------------------------------------------------------------- gate --

function GateScreen() {
  const navigate = useNavigate();
  const { firstName, gate, profile, handbook } = useQuest();

  return (
    <div className="mx-auto max-w-3xl">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        Welcome, {firstName}
      </span>

      <h1 className="mt-4 font-display text-2xl font-bold leading-tight sm:text-3xl">
        Two quick steps stand between you and the system.
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Everything else stays shut until these are done — not to be difficult, but because the rest
        of Quest is built on the answers. About ten minutes ends it.
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {gate.completed} of {gate.total} complete
        </p>
        <p className="text-sm font-semibold tabular-nums text-accent">{gate.percent}%</p>
      </div>
      <Progress value={gate.percent} className="mt-2 h-2" />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <GateCard
          badge="START HERE"
          icon={UserRound}
          title="Make yourself known"
          subtitle={
            profile.complete
              ? "Everything filled in. Your byline is ready."
              : `Missing: ${profile.missing.join(" + ")}`
          }
          percent={profile.percent}
          complete={profile.complete}
          cta="Set up profile"
          onClick={() => navigate("/quest/profile")}
        />
        <GateCard
          icon={BookOpen}
          title="Learn the system"
          subtitle={
            handbook.complete
              ? "All eleven sections read. You have the map."
              : `${handbook.percent}% read — the map before the climb`
          }
          percent={handbook.percent}
          complete={handbook.complete}
          cta={handbook.read > 0 ? "Continue handbook" : "Open handbook"}
          onClick={() => navigate("/quest/handbook")}
        />
      </div>

      <p className="mt-5 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        Finish both and the full command centre opens — your daily brief, the Momentum Meter, the
        Power Tools chain, the award ladder, and every system in here designed to compound from
        this point on.
      </p>
    </div>
  );
}

function GateCard({
  badge,
  icon: Icon,
  title,
  subtitle,
  percent,
  complete,
  cta,
  onClick,
}: {
  badge?: string;
  icon: typeof UserRound;
  title: string;
  subtitle: string;
  percent: number;
  complete: boolean;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-5 text-left transition-colors",
        complete ? "border-success/30" : "border-border hover:border-accent/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl",
            complete ? "bg-success/12 text-success" : "bg-accent/12 text-accent",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {complete ? (
          <StatusPill status="done" />
        ) : badge ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-foreground">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-3 font-display text-base font-semibold">{title}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>

      <Progress value={percent} className="mt-3 h-1.5" />
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

// --------------------------------------------------------- command centre --

function CommandCentre() {
  const navigate = useNavigate();
  const quest = useQuest();
  const { momentum, rituals, completedToday, streak, tools } = quest;

  const ritualsLeft = rituals.length - completedToday.size;

  // One next action for the whole system, chosen in the order that actually
  // compounds: hold the streak first, then move the chain, then contribute.
  const next = ritualsLeft > 0
    ? {
        title: `Finish today's rituals — ${ritualsLeft} left`,
        description: streak.current > 0
          ? `You are ${streak.current} days in. Miss today and it resets.`
          : "Do all seven today and the streak starts.",
        to: "/quest/rituals",
      }
    : tools.next
      ? {
          title: `Continue: ${tools.next.tool.name}`,
          description: `${tools.next.tool.tagline} About ${tools.next.tool.minutes} minutes.`,
          to: "/quest/power-tools",
        }
      : quest.storiesPublished === 0
        ? {
            title: "Write your first story",
            description: "You have done the work. Somebody two months behind you needs to read it.",
            to: "/quest/stories",
          }
        : {
            title: "Read a story and leave a real comment",
            description: momentum.weakest.hint,
            to: "/quest/stories",
          };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight">
          Morning, {quest.firstName}.
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Here is today, in the order that works.
        </p>
      </div>

      <DoThisNext title={next.title} description={next.description} onClick={() => navigate(next.to)} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* The meter. One number, four inputs, and the weakest one named — a
            score with no attached instruction is just a mood. */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-5">
            <ProgressRing value={momentum.score} size={104}>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums">{momentum.score}</p>
                <p className="-mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">of 100</p>
              </div>
            </ProgressRing>

            <div className="min-w-[180px] flex-1">
              <p className="font-display text-base font-semibold">Momentum Meter · {momentum.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                How much of this system is switched on for you.
              </p>

              <div className="mt-3 space-y-2">
                {momentum.bands.map((band) => (
                  <div key={band.key}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={cn(band.key === momentum.weakest.key && "font-semibold text-foreground")}>
                        {band.label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(band.earned)}/{band.weight}
                      </span>
                    </div>
                    <Progress value={(band.earned / band.weight) * 100} className="mt-1 h-1" />
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Biggest gap: <span className="font-medium text-foreground">{momentum.weakest.hint}</span>
              </p>
            </div>
          </div>
        </section>

        {/* The brief. */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="font-display text-base font-semibold">Your daily brief</p>
          <div className="mt-3 space-y-3">
            <BriefLine
              icon={Flame}
              label="Rituals today"
              value={`${completedToday.size}/${rituals.length}`}
              hint={ritualsLeft === 0 ? "All done. Come back tomorrow." : `${ritualsLeft} left`}
              tone={ritualsLeft === 0 ? "good" : "warn"}
            />
            <BriefLine
              icon={Flame}
              label="Current streak"
              value={`${streak.current}d`}
              hint={`Best ${streak.longest}d`}
              tone={streak.current > 0 ? "good" : "muted"}
            />
            <BriefLine
              icon={Zap}
              label="Business potency"
              value={`${tools.potency}/100`}
              hint={`${tools.complete}/${tools.total} tools`}
              tone="muted"
            />
            <BriefLine
              icon={Sparkles}
              label="Total XP"
              value={quest.totalXp.toLocaleString()}
              hint={quest.awardLevel?.title ?? "No award yet"}
              tone="muted"
            />
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Command centre
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUEST_NAV.flatMap((entry) => (isGroup(entry) ? entry.items : [entry]))
            .filter((item) => item.to !== "/quest")
            .map((item) => (
              <CentreCard key={item.to} item={item} />
            ))}
        </div>
      </section>
    </div>
  );
}

function BriefLine({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
  tone: "good" | "warn" | "muted";
}) {
  const tones = {
    good: "text-success",
    warn: "text-[hsl(25_95%_45%)]",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={cn("h-4 w-4 shrink-0", tones[tone])} />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="w-20 shrink-0 truncate text-right text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}

function CentreCard({ item }: { item: QuestNavItem }) {
  const navigate = useNavigate();
  const quest = useQuest();

  // Each card carries the live number that makes it worth opening today.
  const meta: Record<string, { value: string; percent?: number }> = {
    "/quest/rituals": {
      value: `${quest.completedToday.size}/${quest.rituals.length} today`,
      percent: quest.rituals.length ? (quest.completedToday.size / quest.rituals.length) * 100 : 0,
    },
    "/quest/stories": {
      value: quest.storiesPublished
        ? `${quest.storiesPublished} published`
        : quest.storiesDraft
          ? `${quest.storiesDraft} in draft`
          : "Nothing yet",
    },
    "/quest/power-tools": {
      value: `${quest.tools.complete}/${quest.tools.total} · ${quest.tools.potency}/100`,
      percent: (quest.tools.complete / quest.tools.total) * 100,
    },
    "/quest/awards": { value: quest.awardLevel?.title ?? "No rung held yet" },
    "/quest/leaderboard": { value: `${quest.totalXp.toLocaleString()} XP` },
    "/quest/certificates": {
      value: `${quest.awards.filter((a) => a.status === "achieved").length} earned`,
    },
    "/quest/handbook": {
      value: `${quest.handbook.read}/${quest.handbook.total} read`,
      percent: quest.handbook.percent,
    },
    "/quest/hackathon": { value: "Registration closed" },
    "/quest/support": { value: "Always open" },
  };

  const info = meta[item.to];

  return (
    <button
      type="button"
      onClick={() => navigate(item.to)}
      className="flex flex-col rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/40 hover:bg-secondary/30"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
          <item.icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold">{item.label}</p>
      </div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{item.blurb}</p>
      {info && (
        <>
          <p className="mt-3 text-xs font-medium tabular-nums">{info.value}</p>
          {info.percent !== undefined && <Progress value={info.percent} className="mt-1.5 h-1" />}
        </>
      )}
    </button>
  );
}
