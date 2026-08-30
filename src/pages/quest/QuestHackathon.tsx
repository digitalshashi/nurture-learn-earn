import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Rocket, Users, Lock, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuest } from "@/contexts/QuestContext";
import { LockedPanel, StatusPill } from "@/components/quest/QuestPrimitives";
import {
  HACKATHON_SEASON,
  missionOpensAt,
  seasonState,
  splitDuration,
  type Mission,
} from "@/lib/quest/hackathon";
import { cn } from "@/lib/utils";

/**
 * The time-boxed season.
 *
 * Between seasons this screen is mostly locked, and it says so plainly rather
 * than hiding — a member should be able to see what the next sprint asks of
 * them long before they can sign up for it.
 */
export default function QuestHackathon() {
  const navigate = useNavigate();
  const quest = useQuest();
  const [now, setNow] = useState(() => new Date());

  // A minute is enough: the display never shows seconds, so ticking faster
  // would re-render the page for nothing.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!quest.gate.unlocked) {
    return (
      <LockedPanel
        title="The hackathon opens after setup"
        description="Seasons are short and move fast. Finish the gate now so you are ready when the next one starts."
        action={<Button size="sm" onClick={() => navigate("/quest")}>Back to the gate</Button>}
      />
    );
  }

  const season = HACKATHON_SEASON;
  const state = seasonState(season, now);
  const countdown = splitDuration(state.msRemaining);

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

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-[hsl(222_47%_9%)] p-6 text-white sm:p-8">
        {/* A drawn gradient rather than a video: it carries the same weight and
            costs nothing to load on a phone. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px 400px at 15% -10%, hsl(7 95% 60% / 0.5), transparent 60%), radial-gradient(700px 400px at 95% 110%, hsl(260 70% 55% / 0.45), transparent 60%)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-[240px] flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-2.5 py-0.5 text-[11px] font-bold tracking-[0.2em]">
              <Rocket className="h-3 w-3" />
              {season.code}
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-4xl">
              {season.name}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">{season.tagline}</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              {state.phase === "upcoming"
                ? "Starts in"
                : state.phase === "live"
                  ? "Time left"
                  : "Season closed"}
            </p>
            {state.phase === "ended" ? (
              <p className="mt-1 font-display text-2xl font-bold">—</p>
            ) : (
              <div className="mt-1 flex gap-2">
                {[
                  { value: countdown.days, label: "D" },
                  { value: countdown.hours, label: "H" },
                  { value: countdown.minutes, label: "M" },
                ].map((unit) => (
                  <div key={unit.label} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-center">
                    <p className="font-display text-xl font-bold tabular-nums">
                      {String(unit.value).padStart(2, "0")}
                    </p>
                    <p className="text-[9px] tracking-widest text-white/60">{unit.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-6 border-t border-white/15 pt-4">
          <HeroStat label="Missions" value={`0/${state.totalMissions}`} />
          <HeroStat label="Chapters" value={String(season.chapters.length)} />
          <HeroStat
            label="Window"
            value={`${new Date(season.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${new Date(season.endsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
          />

          <div className="ml-auto">
            {season.registrationOpen && season.registerUrl ? (
              <Button asChild size="sm" variant="secondary">
                <a href={season.registerUrl} target="_blank" rel="noreferrer noopener">
                  Register for the hackathon
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70">
                <Lock className="h-3.5 w-3.5" />
                Registration closed
              </span>
            )}
          </div>
        </div>
      </section>

      <Tabs defaultValue="attend" className="mt-5">
        <TabsList className="mb-4">
          <TabsTrigger value="team">My team</TabsTrigger>
          <TabsTrigger value="attend">Attend</TabsTrigger>
          <TabsTrigger value="visualise">Visualise</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </span>
            <p className="font-display text-base font-semibold">Team registration is closed for now</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Nothing has expired and you have not missed anything. Teams are formed in the week
              before a season opens, and everyone with an unlocked command centre gets a place.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="attend">
          <div className="space-y-5">
            {season.chapters.map((chapter, chapterIndex) => (
              <section key={chapter.key}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/12 text-[11px] font-bold text-accent">
                    {chapterIndex + 1}
                  </span>
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
                    {chapter.title}
                  </h2>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {chapter.missions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      opensAt={missionOpensAt(season, mission)}
                      live={state.phase === "live"}
                      now={now}
                    />
                  ))}
                </div>
              </section>
            ))}

            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-info/12 text-info">
                  <Sparkles className="h-3 w-3" />
                </span>
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
                  Bonus missions
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  +EXTRA
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {season.bonusMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    opensAt={new Date(season.startsAt)}
                    live={state.phase === "live"}
                    now={now}
                  />
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="visualise">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-[hsl(222_47%_9%)] px-6 py-16 text-center text-white">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(600px 300px at 50% 0%, hsl(7 95% 60% / 0.25), transparent 70%)" }}
              aria-hidden
            />
            <p className="font-display text-lg font-semibold tracking-[0.2em]">
              THE TRACK OPENS WITH THE SEASON
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Your run through the nine missions is drawn here as you clear them — one lap per
              chapter, with the whole field visible.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/60">{label}</p>
    </div>
  );
}

function MissionCard({
  mission,
  opensAt,
  live,
  now,
}: {
  mission: Mission;
  opensAt: Date;
  live: boolean;
  now: Date;
}) {
  const open = live && now >= opensAt;

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        open ? "border-accent/30 bg-card" : "border-border bg-card opacity-70",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
          {mission.id}
        </span>
        <StatusPill status={open ? "next" : "locked"} label={open ? "OPEN" : undefined} />
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug">{mission.title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{mission.blurb}</p>
      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
        {opensAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
        {opensAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
