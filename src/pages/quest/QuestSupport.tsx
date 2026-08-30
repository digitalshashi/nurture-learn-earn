import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LifeBuoy,
  UserRound,
  BookOpen,
  Flame,
  Wrench,
  PenLine,
  Medal,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useQuest } from "@/contexts/QuestContext";
import { QuestRow } from "@/components/quest/QuestPrimitives";
import { SOCIALS_REQUIRED_TO_PUBLISH } from "@/lib/quest/socials";

/**
 * Support, scoped to Quest.
 *
 * Built around naming the thing you are stuck on rather than describing your
 * whole situation — every row here goes straight to the screen that answers
 * it. The general help hub is one click away for anything this does not
 * cover.
 */
export default function QuestSupport() {
  const navigate = useNavigate();
  const quest = useQuest();

  const stuck = [
    {
      icon: UserRound,
      title: "My profile will not count as complete",
      line: quest.profile.complete
        ? "It is complete — every requirement is filled."
        : `Still missing: ${quest.profile.missing.join(", ")}.`,
      to: "/quest/profile",
    },
    {
      icon: BookOpen,
      title: "The command centre is still locked",
      line: quest.gate.unlocked
        ? "It is open. Both steps are done."
        : `${quest.gate.completed} of ${quest.gate.total} steps done — ${quest.gate.percent}% overall.`,
      to: quest.profile.complete ? "/quest/handbook" : "/quest/profile",
    },
    {
      icon: Flame,
      title: "My streak reset and I do not know why",
      line: "The streak only advances on a day when every ritual is ticked, and only if the day before was also complete.",
      to: "/quest/rituals",
    },
    {
      icon: Wrench,
      title: "A Power Tool is locked",
      line: "The chain is strictly in order. Exactly one tool is open at a time — finish it and the next unlocks.",
      to: "/quest/power-tools",
    },
    {
      icon: PenLine,
      title: "I cannot publish my story",
      line: quest.profile.canPublish
        ? "You can — publishing is unlocked."
        : `Publishing needs ${SOCIALS_REQUIRED_TO_PUBLISH} social profiles. You have ${quest.profile.socialCount}.`,
      to: quest.profile.canPublish ? "/quest/stories" : "/quest/profile",
    },
    {
      icon: Medal,
      title: "My award application has not moved",
      line: "Revenue rungs are reviewed by a person, not detected. Applications sit as pending until somebody reads them.",
      to: "/quest/awards",
    },
  ];

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
          <LifeBuoy className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Support</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Name the thing you are stuck on. Ask earlier than feels comfortable.
          </p>
        </div>
      </header>

      <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        What is stuck?
      </h2>
      <div className="space-y-2">
        {stuck.map((item) => (
          <QuestRow
            key={item.title}
            icon={item.icon}
            title={item.title}
            description={item.line}
            onClick={() => navigate(item.to)}
            action={
              <Button size="sm" variant="ghost">
                Open
              </Button>
            }
          />
        ))}
      </div>

      <h2 className="mb-2 mt-6 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        How Quest works
      </h2>
      <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4">
        <AccordionItem value="gate">
          <AccordionTrigger className="text-sm">Why is anything locked at all?</AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            Because the rest of Quest is built on the answers. The Power Tools chain assumes you
            have written down who you are; the Story Engine assumes there is a byline behind the
            story. Opening everything on day one is how people bounce on day two.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="meter">
          <AccordionTrigger className="text-sm">How is the Momentum Meter calculated?</AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            Four inputs, each capped so no single one can carry the score: setup (20), consistency
            (25), build (35) and contribution (20). Your weakest band is named on the dashboard —
            that is the one worth moving.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="xp">
          <AccordionTrigger className="text-sm">What earns XP?</AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            Each ritual pays its own amount when ticked. Streak milestones pay a bonus at 7, 30, 90
            and 365 days. Finishing a Power Tool pays 100, publishing a story pays 150, and leaving
            a comment pays 5. Re-opening a tool you have already finished pays nothing.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger className="text-sm">Who can see my profile?</AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            Your name, photo and niche appear on the leaderboard and on anything you publish. Your
            phone number, join date and membership record are yours alone — no other member can
            read them.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/support")}>
          <LifeBuoy className="mr-1.5 h-4 w-4" />
          Full help hub
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/messages")}>
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Message your coach
        </Button>
      </div>
    </div>
  );
}
