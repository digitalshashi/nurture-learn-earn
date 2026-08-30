import {
  Home,
  Rocket,
  Flame,
  Sprout,
  UsersRound,
  PenLine,
  Wrench,
  Medal,
  Trophy,
  Award,
  BookOpen,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/**
 * The Quest section's own navigation.
 *
 * Two shapes in one list: flat destinations (Home, Hackathon, Handbook,
 * Support) and named groups that expand (Grow, Community). The sidebar
 * renders both from this array so adding a screen is one entry here rather
 * than an edit in the rail, the mobile strip and the command centre grid.
 */
export interface QuestNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** One line, used on the dashboard's command-centre grid and as a tooltip. */
  blurb: string;
  /**
   * Whether the destination stays shut until the two-step gate is cleared.
   * Home, Handbook and Support never lock: they are how a member gets through
   * the gate in the first place, and locking support is how someone gets
   * stuck with nobody to ask.
   */
  gated: boolean;
}

export interface QuestNavGroup {
  label: string;
  /** Shown on the group's dropdown trigger in the top strip. */
  icon: LucideIcon;
  items: QuestNavItem[];
}

export type QuestNavEntry = QuestNavItem | QuestNavGroup;

export const isGroup = (entry: QuestNavEntry): entry is QuestNavGroup =>
  (entry as QuestNavGroup).items !== undefined;

export const QUEST_NAV: QuestNavEntry[] = [
  {
    label: "Home",
    to: "/quest",
    icon: Home,
    blurb: "Your daily brief and everything that is live right now",
    gated: false,
  },
  {
    label: "Hackathon",
    to: "/quest/hackathon",
    icon: Rocket,
    blurb: "The time-boxed sprint — missions, teams and the countdown",
    gated: true,
  },
  {
    label: "Grow",
    icon: Sprout,
    items: [
      {
        label: "Daily Rituals",
        to: "/quest/rituals",
        icon: Flame,
        blurb: "Seven small practices, one streak",
        gated: true,
      },
      {
        label: "Story Engine",
        to: "/quest/stories",
        icon: PenLine,
        blurb: "Write up your journey for the community",
        gated: true,
      },
      {
        label: "Power Tools",
        to: "/quest/power-tools",
        icon: Wrench,
        blurb: "A seven-step chain that builds your business on paper",
        gated: true,
      },
    ],
  },
  {
    label: "Community",
    icon: UsersRound,
    items: [
      {
        label: "Awards",
        to: "/quest/awards",
        icon: Medal,
        blurb: "The badge ladder and what each rung asks for",
        gated: true,
      },
      {
        label: "Leaderboard",
        to: "/quest/leaderboard",
        icon: Trophy,
        blurb: "Who is ahead, and on what",
        gated: true,
      },
      {
        label: "Certificates",
        to: "/quest/certificates",
        icon: Award,
        blurb: "Everything you have been awarded, ready to share",
        gated: true,
      },
    ],
  },
  {
    label: "Handbook",
    to: "/quest/handbook",
    icon: BookOpen,
    blurb: "The map before the climb — eleven short sections",
    gated: false,
  },
  {
    label: "Support",
    to: "/quest/support",
    icon: LifeBuoy,
    blurb: "Stuck on something? Start here",
    gated: false,
  },
];

/** Every destination, groups flattened — for matching the current route. */
export const QUEST_NAV_ITEMS: QuestNavItem[] = QUEST_NAV.flatMap((entry) =>
  isGroup(entry) ? entry.items : [entry],
);

/**
 * The nav item a path belongs to.
 *
 * Longest match wins, so /quest/power-tools resolves to Power Tools rather
 * than to Home, which every /quest path starts with.
 */
export function matchQuestNav(pathname: string): QuestNavItem | undefined {
  return QUEST_NAV_ITEMS.filter(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0];
}
