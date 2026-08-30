import { useLocation, useNavigate } from "react-router-dom";
import { Settings, Lock, Flame, Wrench, BookOpen, ChevronRight, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQuest } from "@/contexts/QuestContext";
import {
  QUEST_NAV,
  isGroup,
  matchQuestNav,
  type QuestNavGroup,
  type QuestNavItem,
} from "@/lib/quest/nav";

/**
 * The Quest section's navigation, across the top.
 *
 * It began as a second left rail, which put two sidebars on screen at once —
 * the app's and this one — and the page paid for both. Horizontally it costs
 * one strip and gives the content the full width back.
 *
 * Deliberately not sticky: the profile screen's Save bar already sticks at the
 * top of the same scroll container, and two elements stuck to the same offset
 * land on top of each other.
 */
export function QuestTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const quest = useQuest();
  const active = matchQuestNav(location.pathname);

  return (
    <div className="mb-5 border-b border-border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
        {quest.gate.unlocked ? <LiveChip /> : <GateChip />}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-2.5 py-1 text-[11px] font-semibold text-accent">
            {quest.questProfile?.membership_level ?? "Member"}
            {quest.awardLevel && (
              <span className="font-normal text-muted-foreground">· {quest.awardLevel.title}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => navigate("/quest/profile")}
            aria-label="Quest profile settings"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* The strip scrolls rather than wraps, so the row height never changes
          and the active underline stays on one line. */}
      <nav
        aria-label="Quest sections"
        className="-mx-4 flex items-stretch overflow-x-auto scrollbar-none px-4 sm:-mx-6 sm:px-6"
      >
        {QUEST_NAV.map((entry) =>
          isGroup(entry) ? (
            <NavGroupTab
              key={entry.label}
              group={entry}
              activeTo={active?.to}
              // While the gate state is still loading everything would flash a
              // padlock and then lose it, so locks wait for real data.
              gateShut={!quest.loading && !quest.gate.unlocked}
            />
          ) : (
            <NavTab
              key={entry.to}
              item={entry}
              active={active?.to === entry.to}
              locked={!quest.loading && entry.gated && !quest.gate.unlocked}
            />
          ),
        )}
      </nav>
    </div>
  );
}

/**
 * A group, as a dropdown.
 *
 * The trigger carries the underline when any of its children is the current
 * screen, because that child's own name is hidden inside the menu — without
 * it there would be no lit tab at all on three of the eleven screens.
 */
function NavGroupTab({
  group,
  activeTo,
  gateShut,
}: {
  group: QuestNavGroup;
  activeTo?: string;
  gateShut: boolean;
}) {
  const navigate = useNavigate();
  const holdsActive = group.items.some((item) => item.to === activeTo);
  // Only when every child is shut — a group with one open child is not locked.
  const locked = gateShut && group.items.every((item) => item.gated);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-current={holdsActive ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            holdsActive
              ? "border-accent font-medium text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground",
            locked && !holdsActive && "opacity-55",
          )}
        >
          <group.icon className="h-4 w-4 shrink-0" />
          {group.label}
          {locked && <Lock className="h-3 w-3 shrink-0" />}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {group.items.map((item) => {
          const itemLocked = gateShut && item.gated;
          return (
            <DropdownMenuItem
              key={item.to}
              onSelect={() => navigate(item.to)}
              className={cn(
                "flex items-start gap-2.5 py-2",
                item.to === activeTo && "bg-accent/10 text-accent",
              )}
            >
              <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {item.label}
                  {itemLocked && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {item.blurb}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavTab({
  item,
  active,
  locked,
}: {
  item: QuestNavItem;
  active: boolean;
  locked: boolean;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(item.to)}
      aria-current={active ? "page" : undefined}
      title={item.blurb}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-accent font-medium text-accent"
          : "border-transparent text-muted-foreground hover:text-foreground",
        // Locked is dimmed, never removed, and stays clickable — the screen
        // behind it explains what is still needed.
        locked && !active && "opacity-55",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
      {locked && <Lock className="h-3 w-3 shrink-0" />}
    </button>
  );
}

/** The gate's progress, wherever you are in the section. */
function GateChip() {
  const navigate = useNavigate();
  const { gate, profile, handbook } = useQuest();

  return (
    <button
      type="button"
      onClick={() => navigate(profile.complete ? "/quest/handbook" : "/quest/profile")}
      className="group flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-1.5 text-left transition-colors hover:border-accent/40"
    >
      <span className="text-xs font-semibold">Unlock the Command Centre</span>
      <span className="hidden text-[11px] text-muted-foreground sm:inline">
        {gate.completed} of {gate.total} steps
      </span>
      <Progress value={gate.percent} className="h-1.5 w-16 shrink-0" />
      <span className="text-[11px] font-semibold tabular-nums text-accent">{gate.percent}%</span>
      <span className="hidden truncate text-[11px] text-muted-foreground lg:inline">
        {profile.complete
          ? `Handbook — ${handbook.read}/${handbook.total} read`
          : "Fill your profile → then the handbook"}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/**
 * What is live for this member right now.
 *
 * The rail used to carry these as banner cards pinned under the nav — the
 * thing that stopped it reading as a static menu. One chip is the horizontal
 * equivalent: the single most urgent item, not a row of five.
 */
function LiveChip() {
  const navigate = useNavigate();
  const quest = useQuest();

  const ritualsLeft = quest.rituals.length - quest.completedToday.size;

  const live =
    ritualsLeft > 0
      ? {
          icon: Flame,
          tone: "border-[hsl(25_95%_53%/0.3)] bg-[hsl(25_95%_53%/0.08)]",
          label: quest.streak.current > 0 ? `${quest.streak.current}-DAY STREAK` : "TODAY",
          title: `${ritualsLeft} ritual${ritualsLeft === 1 ? "" : "s"} left`,
          line:
            quest.streak.current > 0
              ? "Finish them today or the streak resets."
              : "Finish all of them to start a streak.",
          to: "/quest/rituals",
        }
      : quest.tools.next
        ? {
            icon: Wrench,
            tone: "border-info/25 bg-info/[0.07]",
            label: `STEP ${quest.tools.complete + 1} OF ${quest.tools.total}`,
            title: quest.tools.next.tool.name,
            line: `About ${quest.tools.next.tool.minutes} minutes.`,
            to: "/quest/power-tools",
          }
        : {
            icon: BookOpen,
            tone: "border-border bg-card",
            label: "REFRESHER",
            title: "Re-read the handbook",
            line: "Half of it reads differently after thirty days.",
            to: "/quest/handbook",
          };

  return (
    <button
      type="button"
      onClick={() => navigate(live.to)}
      className={cn(
        "group flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left transition-opacity hover:opacity-90",
        live.tone,
      )}
    >
      <live.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="hidden text-[10px] font-bold tracking-wider text-muted-foreground sm:inline">
        {live.label}
      </span>
      <span className="truncate text-xs font-semibold">{live.title}</span>
      <span className="hidden truncate text-[11px] text-muted-foreground lg:inline">{live.line}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
