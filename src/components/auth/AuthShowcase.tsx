/**
 * The panel beside the sign-in form.
 *
 * Most auth pages put a stock photo or a gradient here. This one puts the
 * product: the app's own surfaces, rendered small and looping through the
 * states they actually move through.
 *
 * The thing it has to get right is audience. One page signs in both sides of
 * the platform — a learner opening their next lesson and the coach who sold it
 * to them — and the page cannot know which until after they authenticate. So
 * it says both, plainly and in that order: a learner surface and a coach
 * surface side by side, and a feature rail split into the two halves rather
 * than one undifferentiated list. Copy addressed only to sellers would tell
 * every student on the platform they were on the wrong page.
 *
 * The colours are the app's four semantic tokens rather than a decorative
 * palette: coral is the brand, green is money, indigo is information, blue is
 * a link. So the panel is colourful because the product is, and it follows
 * light and dark with everything else.
 *
 * Feature names and icons are looked up from APP_NAV_SECTIONS — the same list
 * the sidebar renders — so the rail cannot advertise something that does not
 * exist. Which side of the platform each one belongs to is decided here.
 *
 * Entirely decorative: aria-hidden, and the numbers are illustrative rather
 * than anyone's real data.
 */
import { useEffect, useMemo, useState } from "react";
import { APP_NAV_SECTIONS, type AppNavItem } from "@/lib/appNav";
import { cn } from "@/lib/utils";
import { GraduationCap, MessageSquare, Play, Store, TrendingUp } from "lucide-react";

/** One beat per surface, slow enough to read as calm rather than busy. */
const BEAT_MS = 3200;

/** Lessons completed at each beat — the loop the course card walks. */
const LESSON_STEPS = [11, 12, 13, 14];
const LESSON_TOTAL = 18;

/** Rupees banked at each beat. Illustrative, and plainly a demo. */
const REVENUE_STEPS = [124800, 131400, 138900, 146200];

/** Alternating sides, so neither audience goes long without seeing itself. */
const ACTIVITY = [
  { who: "Priya", what: "asked a question on Lesson 4", tone: "info" as const },
  { who: "Arjun", what: "enrolled in Sales Mastery", tone: "success" as const },
  { who: "Meera", what: "earned her certificate", tone: "accent" as const },
  { who: "Dev", what: "joined the Thursday workshop", tone: "link" as const },
];

/**
 * The two halves of the platform, by route.
 *
 * Titles and icons come from the nav; only the grouping lives here, because
 * the nav has no notion of who a destination is for.
 */
const LEARNER_ROUTES = ["/courses", "/feed", "/student-events", "/leaderboard", "/messages"];
const COACH_ROUTES = ["/course-manage", "/sales/earnings", "/crm", "/marketing/broadcasts", "/automation/path"];

function useBeat(): number {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    // Someone who has asked for less motion gets the panel in one fixed
    // state — still legible, just not moving.
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still) return;

    const timer = setInterval(() => setBeat((b) => b + 1), BEAT_MS);
    return () => clearInterval(timer);
  }, []);

  return beat;
}

/** Looks routes up in the nav, dropping any that no longer exist. */
function featuresFor(routes: string[]): AppNavItem[] {
  const all = APP_NAV_SECTIONS.flatMap((section) => section.items);
  return routes
    .map((url) => all.find((item) => item.url === url))
    .filter((item): item is AppNavItem => Boolean(item));
}

export function AuthShowcase({ className }: { className?: string }) {
  const beat = useBeat();

  const lessons = LESSON_STEPS[beat % LESSON_STEPS.length];
  const revenue = REVENUE_STEPS[beat % REVENUE_STEPS.length];
  const activity = ACTIVITY[beat % ACTIVITY.length];
  const progress = Math.round((lessons / LESSON_TOTAL) * 100);

  const learnerFeatures = useMemo(() => featuresFor(LEARNER_ROUTES), []);
  const coachFeatures = useMemo(() => featuresFor(COACH_ROUTES), []);

  return (
    <aside
      aria-hidden
      className={cn(
        "relative isolate hidden overflow-hidden bg-[hsl(var(--card))] lg:flex lg:flex-col lg:justify-between",
        className,
      )}
    >
      {/* Ground: soft washes on the brand, money, information and link hues. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-accent/30 blur-[110px]" />
        <div className="absolute -bottom-40 -right-28 h-[32rem] w-[32rem] rounded-full bg-info/28 blur-[110px]" />
        {/* Sits in the middle, where the two corner washes would otherwise
            leave a pale band across the panel's waist. */}
        <div className="absolute left-[38%] top-[42%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/22 blur-[100px]" />
        <div className="absolute -bottom-24 left-4 h-64 w-64 rounded-full bg-link/20 blur-[90px]" />
        {/* A faint grid, the same one the app's canvases use, to stop the
            washes reading as an empty gradient. */}
        <div
          className="absolute inset-0 opacity-[0.55] dark:opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 50% 40%, black 35%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 35%, transparent 85%)",
          }}
        />
      </div>

      <div className="flex flex-1 flex-col justify-center px-10 py-12 xl:px-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          One account, both sides
        </p>
        <h2 className="mt-3 max-w-xl font-display text-[2.35rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground xl:text-[2.9rem]">
          Learn here.
          <br />
          Teach here.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Courses, community and events for the people learning. Payments, CRM and automation for
          the coaches running it all. Same login, either way.
        </p>

        {/* The product, small and moving — one surface from each side. */}
        <div className="mt-9 grid max-w-lg grid-cols-5 gap-3">
          {/* What a learner opens the app to do. */}
          <div className="col-span-3 rounded-2xl border border-border bg-card/85 p-4 backdrop-blur-sm">
            <p className="mb-2.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <GraduationCap className="h-3 w-3" /> Learning
            </p>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-tight">Sales Mastery</p>
                <p className="text-[11px] text-muted-foreground">
                  Lesson {lessons} of {LESSON_TOTAL}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* What a coach opens the app to check. */}
          <div className="col-span-2 rounded-2xl border border-border bg-card/85 p-4 backdrop-blur-sm">
            <p className="mb-2.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Store className="h-3 w-3" /> Coaching
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">This month</p>
            <p className="mt-0.5 font-display text-lg font-extrabold tabular-nums tracking-tight text-foreground">
              ₹{revenue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3 w-3" /> +12%
            </p>
          </div>

          {/* The community both sides share. */}
          <div className="col-span-5 flex items-center gap-3 rounded-2xl border border-border bg-card/85 p-3.5 backdrop-blur-sm">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white transition-colors duration-500",
                activity.tone === "info" && "bg-info",
                activity.tone === "success" && "bg-success",
                activity.tone === "accent" && "bg-accent",
                activity.tone === "link" && "bg-link",
              )}
            >
              {activity.who.charAt(0)}
            </span>
            <p key={beat} className="animate-fade-in truncate text-[13px] text-foreground">
              <span className="font-semibold">{activity.who}</span>{" "}
              <span className="text-muted-foreground">{activity.what}</span>
            </p>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Live
            </span>
          </div>
        </div>
      </div>

      {/* The rail, split down the middle: a student can see the half that is
          theirs instead of scanning a list of billing and CRM tools. */}
      <div className="grid grid-cols-2 gap-6 border-t border-border/50 px-10 py-6 xl:px-14">
        <FeatureGroup label="If you're learning" features={learnerFeatures} />
        <FeatureGroup label="If you're coaching" features={coachFeatures} />
      </div>
    </aside>
  );
}

function FeatureGroup({ label, features }: { label: string; features: AppNavItem[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {features.map((feature) => (
          <span
            key={feature.url}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
          >
            <feature.icon className="h-3 w-3" />
            {feature.title}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The same idea at a tenth the size, for the top of the form on phones —
 * where the panel is hidden and the page would otherwise open on a bare field.
 */
export function AuthShowcaseCompact() {
  const beat = useBeat();
  const activity = ACTIVITY[beat % ACTIVITY.length];

  return (
    <div
      aria-hidden
      className="mb-5 flex items-center gap-2.5 rounded-xl border border-border bg-card/80 px-3 py-2.5 lg:hidden"
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-accent" />
      <p key={beat} className="animate-fade-in truncate text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{activity.who}</span> {activity.what}
      </p>
    </div>
  );
}
