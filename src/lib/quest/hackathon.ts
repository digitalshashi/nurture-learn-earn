/**
 * The hackathon season.
 *
 * One config object, edited when a season is scheduled. Everything on the
 * screen — the countdown, the mission roadmap, whether teams can register —
 * reads from here, so announcing a season is a single change rather than a
 * hunt through the page.
 */

export interface Mission {
  /** M1–M9, shown on the card. */
  id: string;
  title: string;
  /** Minutes after the season opens that this mission unlocks. */
  offsetHours: number;
  blurb: string;
}

export interface Chapter {
  key: string;
  title: string;
  missions: Mission[];
}

export interface HackathonSeason {
  /** Short badge, e.g. "H1". */
  code: string;
  name: string;
  tagline: string;
  startsAt: string;
  endsAt: string;
  /** Teams can only be formed while this is true. */
  registrationOpen: boolean;
  registerUrl: string | null;
  chapters: Chapter[];
  bonusMissions: Mission[];
}

export const HACKATHON_SEASON: HackathonSeason = {
  code: "H1",
  name: "Build Sprint",
  tagline: "Nine missions. Twelve days. One thing shipped at the end of it.",
  // ISO, local time. Update these when a season is announced.
  startsAt: "2027-01-12T09:00:00",
  endsAt: "2027-01-24T21:00:00",
  registrationOpen: false,
  registerUrl: null,
  chapters: [
    {
      key: "ignition",
      title: "Ignition",
      missions: [
        { id: "M1", title: "Name the thing", offsetHours: 0, blurb: "One sentence. No hedging." },
        { id: "M2", title: "Find five people who want it", offsetHours: 24, blurb: "Actual names, actual replies." },
        { id: "M3", title: "Ship the ugliest possible version", offsetHours: 48, blurb: "It has to work. It does not have to be nice." },
      ],
    },
    {
      key: "acceleration",
      title: "Acceleration",
      missions: [
        { id: "M4", title: "Put it in front of ten strangers", offsetHours: 96, blurb: "Watch them use it. Say nothing." },
        { id: "M5", title: "Fix only what broke", offsetHours: 120, blurb: "Not what you wish you had built." },
        { id: "M6", title: "Charge somebody", offsetHours: 168, blurb: "Any amount. The first one is the hard one." },
      ],
    },
    {
      key: "domination",
      title: "Domination",
      missions: [
        { id: "M7", title: "Write up what happened", offsetHours: 216, blurb: "Publish it to the community." },
        { id: "M8", title: "Do it again, faster", offsetHours: 240, blurb: "Same loop, second customer." },
        { id: "M9", title: "Hand it to the room", offsetHours: 264, blurb: "Five minutes on stage. Numbers, not vibes." },
      ],
    },
  ],
  bonusMissions: [
    { id: "B1", title: "Bring somebody in", offsetHours: 0, blurb: "Recruit a member who has never shipped." },
    { id: "B2", title: "Publish daily", offsetHours: 0, blurb: "Every day of the sprint, without missing one." },
  ],
};

export type SeasonPhase = "upcoming" | "live" | "ended";

export interface SeasonState {
  phase: SeasonPhase;
  /** Milliseconds until the next boundary — the start, or the end. */
  msRemaining: number;
  totalMissions: number;
}

export function seasonState(season: HackathonSeason, now: Date): SeasonState {
  const start = new Date(season.startsAt).getTime();
  const end = new Date(season.endsAt).getTime();
  const current = now.getTime();
  const totalMissions =
    season.chapters.reduce((sum, chapter) => sum + chapter.missions.length, 0) +
    season.bonusMissions.length;

  if (current < start) return { phase: "upcoming", msRemaining: start - current, totalMissions };
  if (current < end) return { phase: "live", msRemaining: end - current, totalMissions };
  return { phase: "ended", msRemaining: 0, totalMissions };
}

/** Days / hours / minutes, floored, for the countdown display. */
export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** When a mission opens, given the season it belongs to. */
export const missionOpensAt = (season: HackathonSeason, mission: Mission) =>
  new Date(new Date(season.startsAt).getTime() + mission.offsetHours * 3_600_000);
