/**
 * The Handbook: eleven short sections that double as the onboarding script.
 *
 * This is authored content, not data, so it ships with the front end. What is
 * stored per member is only which sections they have finished
 * (quest_handbook_progress), which is why every section key here is stable —
 * renaming one would hand a member back a section they had already read.
 *
 * The order is the argument: what this place is, what the dashboard shows,
 * what to do each day, how progress is measured, what the tools build, what
 * the awards mean, where the whole thing is going, and then the practical
 * matter of getting help.
 */

export type HandbookBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "values"; items: { icon: string; label: string; line: string }[] }
  | { type: "ladder"; steps: { label: string; detail: string }[] }
  | { type: "tip"; text: string };

export interface HandbookSection {
  key: string;
  title: string;
  /** Shown beside the title in the contents list. */
  minutes: number;
  blocks: HandbookBlock[];
}

export const HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    key: "welcome",
    title: "Welcome to your journey",
    minutes: 3,
    blocks: [
      {
        type: "p",
        text: "You have joined something that only works if you show up. Not dramatically, and not for eight hours a day — but on most days, for a few minutes, doing the small set of things that compound. That is the whole bet this place is built on.",
      },
      {
        type: "p",
        text: "Everything in Quest exists to make those few minutes obvious. There is no guessing what to do next: there is a list, the list has a status, and the status is either done, next, or locked. Nothing hides.",
      },
      { type: "h", text: "What we hold to" },
      {
        type: "values",
        items: [
          { icon: "⚡", label: "Momentum", line: "A small thing finished today beats a big thing planned for Monday." },
          { icon: "🎯", label: "Clarity", line: "If you cannot say what you are building, you are not building it yet." },
          { icon: "🤝", label: "Service", line: "The fastest way to grow an audience is to be useful to one person at a time." },
          { icon: "📈", label: "Compounding", line: "Nothing here pays off in a week. Almost everything pays off in a year." },
        ],
      },
      {
        type: "tip",
        text: "Read this handbook once, quickly. You are not memorising it — you are building a map so the rest of the platform stops feeling like a menu of unrelated screens.",
      },
    ],
  },
  {
    key: "dashboard",
    title: "Your dashboard at a glance",
    minutes: 2,
    blocks: [
      {
        type: "p",
        text: "Quest Home is the one screen you open every day. Until you finish setting up, it shows a gate: two steps, a shared progress bar, and nothing else. That is deliberate — a dashboard full of tools you have not earned context for is just noise.",
      },
      { type: "h", text: "Once the gate opens" },
      {
        type: "list",
        items: [
          "Your daily brief — today's rituals, the streak you are defending, and the single next action across the whole system.",
          "The Momentum Meter — one number that rolls up your rituals, your tools and your published work.",
          "The command centre — every Quest screen as a card, with its own live progress.",
          "Live context — whatever is currently running for you gets pinned in the sidebar, so you never miss a countdown.",
        ],
      },
      {
        type: "tip",
        text: "The left rail follows you everywhere inside Quest. If you are ever lost, the top of it always says how far through setup you are.",
      },
    ],
  },
  {
    key: "daily-brief",
    title: "Your daily brief",
    minutes: 3,
    blocks: [
      {
        type: "p",
        text: "The brief is the answer to the only question that matters in the morning: what do I do first? It is assembled fresh each day from your actual state, not from a schedule you set once and stopped following.",
      },
      {
        type: "list",
        items: [
          "Rituals you have not ticked yet today, in the order they work best.",
          "The next unlocked Power Tool, with the reason it is next.",
          "Anything the community is waiting on you for — a comment, a reply, an unfinished draft.",
        ],
      },
      {
        type: "p",
        text: "The brief never shows you more than you can finish. If everything is done, it says so and gets out of the way, which is the point.",
      },
      {
        type: "tip",
        text: "Do the brief before you open your inbox. The order matters more than the content — the first hour sets what the day is about.",
      },
    ],
  },
  {
    key: "momentum-meter",
    title: "The Momentum Meter — how you are measured",
    minutes: 4,
    blocks: [
      {
        type: "p",
        text: "One number, out of 100, for how much of this system is actually working for you. It is not a score of how good you are. It is a score of how much of the machine you have switched on.",
      },
      { type: "h", text: "What feeds it" },
      {
        type: "list",
        items: [
          "Setup — a filled profile and a read handbook. Worth the least, but it gates everything else.",
          "Consistency — your current ritual streak, capped so a long streak cannot mask everything else being idle.",
          "Build — how far along the seven Power Tools you are, weighted towards the ones that produce a real artefact.",
          "Contribution — stories published and comments left. Reading does not count; being useful does.",
        ],
      },
      {
        type: "p",
        text: "The meter moves slowly on purpose. A number that jumps ten points because you ticked one box teaches you to game the box.",
      },
      {
        type: "tip",
        text: "If your meter is stuck, look at which of the four inputs is at zero rather than trying to push the one that is already highest.",
      },
    ],
  },
  {
    key: "power-tools",
    title: "Your Power Tools journey",
    minutes: 5,
    blocks: [
      {
        type: "p",
        text: "Seven tools, opened one at a time, in order. Each one asks you a short set of questions and gives you back a document you can keep. By the end you have written down your entire business — who you are, who you serve, how you show up, what you sell, what you are good at, and what you are going to publish.",
      },
      {
        type: "p",
        text: "They are locked in sequence because the answers stack. The Niche Finder is close to useless before the Personal Codex: you cannot pick a market you were built to serve until you have written down what you were built for.",
      },
      { type: "h", text: "The chain" },
      {
        type: "ladder",
        steps: [
          { label: "Personal Codex", detail: "Values, voice, and what a good day actually looks like." },
          { label: "Niche Finder", detail: "The specific market your codex points at." },
          { label: "Coach Persona", detail: "How you show up in front of that market." },
          { label: "Business Codex", detail: "The offer, the price, and the path a stranger takes to it." },
          { label: "Skills Scorecard", detail: "An honest rating of the seven skills that move the number." },
          { label: "Short-Form Challenge", detail: "Thirty videos around one topic, planned in one sitting." },
          { label: "Long-Form Codex", detail: "A year of long videos — 104 of them, engineered rather than improvised." },
        ],
      },
      {
        type: "tip",
        text: "Every completed tool exports as a text file. Keep them. Re-reading last quarter's Personal Codex is the cheapest strategy session you will ever run.",
      },
    ],
  },
  {
    key: "awards",
    title: "Awards and the Hall of Fame",
    minutes: 3,
    blocks: [
      {
        type: "p",
        text: "The award ladder is a public record of what you have actually done. The lower rungs unlock themselves the moment you meet the condition. The upper rungs — the revenue milestones — you apply for, and a human checks.",
      },
      {
        type: "p",
        text: "That split is on purpose. Anything a system can verify, it verifies. Anything that depends on numbers only you can see gets read by a person, because a self-declared milestone that nobody checks is worth nothing to the member standing next to you.",
      },
      {
        type: "list",
        items: [
          "Locked rungs stay visible. You should always be able to see what the next one asks for.",
          "Applying is not winning — an application sits as pending until it is reviewed.",
          "Every rung you clear issues a certificate you can download and share.",
        ],
      },
    ],
  },
  {
    key: "the-path",
    title: "The path: Starter to Scale",
    minutes: 4,
    blocks: [
      {
        type: "p",
        text: "Five stages. Most people badly misjudge which one they are in, usually by one stage upward, and then apply advice meant for a stage they have not reached.",
      },
      {
        type: "ladder",
        steps: [
          { label: "Starter", detail: "No offer yet. The job is to pick a market and talk to it, publicly, for ninety days." },
          { label: "First Sale", detail: "One offer, sold by hand, to people you spoke to yourself. Do not automate anything here." },
          { label: "Repeatable", detail: "The same offer sold the same way ten times. Now write down what you did, because this is the thing you will scale." },
          { label: "Systemised", detail: "The repeatable thing runs without you in every step. Content, delivery and follow-up all have an owner or a tool." },
          { label: "Scale", detail: "More of the same, deliberately — new channels, higher prices, a team. Nothing new is invented at this stage." },
        ],
      },
      {
        type: "tip",
        text: "Be one stage more conservative than feels right. The cost of running Starter tactics at the Repeatable stage is a slow quarter; the reverse is a wasted year.",
      },
    ],
  },
  {
    key: "rituals",
    title: "Rituals, stories and streaks",
    minutes: 3,
    blocks: [
      {
        type: "p",
        text: "Seven daily practices, split into two groups. Five are mindset — quiet, private, and entirely about arriving at your desk as the person who does the work. Two are community — reading someone else's story, and leaving a comment worth reading.",
      },
      {
        type: "p",
        text: "The streak advances only when all seven are done. There is no partial credit for a day, because a habit that runs five days out of seven is a different habit from one that runs every day, and the whole point is to know which one you have.",
      },
      {
        type: "list",
          items: [
          "Miss a day and the current streak resets. Your longest streak is kept forever.",
          "Milestones at 7, 30 and 90 days carry bonus XP.",
          "The streak leaderboard is public. This is a feature, not a threat.",
        ],
      },
      {
        type: "tip",
        text: "Do the community two first on a low-energy day. Reading somebody else's week is the cheapest way back into your own.",
      },
    ],
  },
  {
    key: "support",
    title: "Support: the clarity engine",
    minutes: 2,
    blocks: [
      {
        type: "p",
        text: "Being stuck is normal and being quietly stuck for three weeks is not. Support is built around naming the thing you are stuck on rather than describing your whole situation.",
      },
      {
        type: "list",
        items: [
          "Pick the area you are stuck in — offer, audience, delivery, pricing, or the platform itself.",
          "Work the checklist for that area. Most of the time the answer is in it.",
          "If it is not, that checklist becomes the context attached to your question, so nobody has to ask you five clarifying questions first.",
        ],
      },
      {
        type: "tip",
        text: "Ask earlier than feels comfortable. The cost of a question is five minutes; the cost of guessing is usually a month.",
      },
    ],
  },
  {
    key: "profile",
    title: "Profile, referrals and membership",
    minutes: 3,
    blocks: [
      {
        type: "p",
        text: "Your profile does more work than it looks like it does. Your designation and community name are the byline on every story you publish. Your social links are what a reader clicks when a story lands. Your city puts you on the map for in-person meets.",
      },
      {
        type: "p",
        text: "Membership level and achievement level are not editable, and that is the point — they are pulled from your billing record and assigned by admins respectively. A tier you could type in yourself would mean nothing to anyone reading it.",
      },
      {
        type: "list",
        items: [
          "Three social links are required before you can publish a story.",
          "Your photo is used across stories, the leaderboard and the member directory — upload it once.",
          "Referrals are tracked from the link through to the purchase, and they credit you at every step.",
        ],
      },
    ],
  },
  {
    key: "ready",
    title: "You're ready",
    minutes: 1,
    blocks: [
      {
        type: "p",
        text: "That is the whole map. You now know what every screen is for, which is more than most members know after a month.",
      },
      { type: "h", text: "The first week, in order" },
      {
        type: "list",
        items: [
          "Finish your profile, including three social links.",
          "Tick all seven rituals for one day. Then do it again tomorrow.",
          "Open the Personal Codex and finish it in one sitting — it takes about twenty minutes.",
          "Read one story from the community and leave a real comment on it.",
        ],
      },
      {
        type: "tip",
        text: "Come back to this handbook in thirty days. Half of it will read completely differently once you have context for it.",
      },
    ],
  },
];

export const HANDBOOK_TOTAL = HANDBOOK_SECTIONS.length;

export const handbookIndex = (key: string) =>
  HANDBOOK_SECTIONS.findIndex((section) => section.key === key);
