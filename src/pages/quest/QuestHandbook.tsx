import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BookOpen, Check, ChevronLeft, ChevronRight, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { HANDBOOK_SECTIONS, type HandbookBlock } from "@/lib/quest/handbook";
import { cn } from "@/lib/utils";

/**
 * Step two of the gate, and the only long-form reading in Quest.
 *
 * Contents on the left with a tick per section, one section on the right, and
 * a counter at the top. The section lives in the URL so a member can be sent
 * straight to one, and so a refresh does not dump them back at section one.
 */
export default function QuestHandbook() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const quest = useQuest();
  const [marking, setMarking] = useState(false);

  const paramKey = params.get("s");
  const activeIndex = Math.max(
    0,
    HANDBOOK_SECTIONS.findIndex((s) => s.key === paramKey),
  );
  const section = HANDBOOK_SECTIONS[activeIndex];
  const isRead = quest.handbookRead.has(section.key);

  const open = (key: string) => {
    setParams(key === HANDBOOK_SECTIONS[0].key ? {} : { s: key }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markRead = async () => {
    if (!user || isRead) return;
    setMarking(true);

    const { error } = await supabase
      .from("quest_handbook_progress")
      .upsert(
        { user_id: user.id, section_key: section.key },
        { onConflict: "user_id,section_key", ignoreDuplicates: true },
      );

    setMarking(false);
    if (error) {
      toast({ title: "Couldn't save your progress", description: error.message, variant: "destructive" });
      return;
    }

    await quest.refresh();

    const next = HANDBOOK_SECTIONS[activeIndex + 1];
    if (next) {
      open(next.key);
      return;
    }

    // Last section. If this was the second gate step, say so — the reward for
    // finishing is the thing it was gating, not a toast.
    toast({
      title: "Handbook finished",
      description: quest.profile.complete
        ? "That was the last gate step. The command centre is open."
        : "One step left — finish your profile and Quest opens.",
    });
    navigate("/quest");
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">Handbook</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              The map before the climb — eleven short sections.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-52">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {quest.handbook.read} of {quest.handbook.total} read
            </span>
            <span className="font-semibold tabular-nums text-accent">{quest.handbook.percent}%</span>
          </div>
          <Progress value={quest.handbook.percent} className="mt-1.5 h-2" />
        </div>
      </header>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Contents. A scrolling strip on a phone, a rail on desktop. */}
        <nav
          aria-label="Handbook contents"
          className="-mx-4 flex gap-2 overflow-x-auto scrollbar-none px-4 lg:mx-0 lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
        >
          {HANDBOOK_SECTIONS.map((entry, index) => {
            const read = quest.handbookRead.has(entry.key);
            const active = entry.key === section.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => open(entry.key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors lg:shrink",
                  active
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] font-bold tabular-nums",
                    read
                      ? "border-success bg-success text-success-foreground"
                      : active
                        ? "border-accent text-accent"
                        : "border-border",
                  )}
                >
                  {read ? <Check className="h-2.5 w-2.5" /> : index + 1}
                </span>
                <span className="whitespace-nowrap lg:whitespace-normal lg:leading-snug">
                  {entry.title}
                </span>
              </button>
            );
          })}
        </nav>

        <article className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Section {activeIndex + 1} of {HANDBOOK_SECTIONS.length} · {section.minutes} min read
              </p>
              <h2 className="mt-1 font-display text-lg font-bold sm:text-xl">{section.title}</h2>
            </div>
            {isRead && (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                <Check className="h-3 w-3" />
                READ
              </span>
            )}
          </div>

          {/* Capped rather than stretched: with the section nav moved to the
              top there is no rail eating the width any more, and prose set to
              the full 1400px is a chore to read. */}
          <div className="max-w-2xl space-y-4">
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              variant="ghost"
              size="sm"
              disabled={activeIndex === 0}
              onClick={() => open(HANDBOOK_SECTIONS[activeIndex - 1].key)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            {isRead ? (
              <Button
                size="sm"
                variant="outline"
                disabled={activeIndex === HANDBOOK_SECTIONS.length - 1}
                onClick={() => open(HANDBOOK_SECTIONS[activeIndex + 1].key)}
              >
                Next section
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={markRead} disabled={marking}>
                {marking ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                {activeIndex === HANDBOOK_SECTIONS.length - 1 ? "Finish handbook" : "Mark as read"}
              </Button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function Block({ block }: { block: HandbookBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>;

    case "h":
      return <h3 className="pt-2 font-display text-base font-semibold">{block.text}</h3>;

    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      );

    case "values":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {block.items.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="text-sm font-semibold">
                <span className="mr-1.5" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.line}</p>
            </div>
          ))}
        </div>
      );

    case "ladder":
      return (
        <ol className="space-y-2">
          {block.steps.map((step, index) => (
            <li key={step.label} className="flex gap-3 rounded-xl border border-border bg-secondary/30 p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/12 text-[11px] font-bold tabular-nums text-accent">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      );

    case "tip":
      return (
        <div className="flex gap-2.5 rounded-xl border border-info/25 bg-info/[0.06] p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Tip: </span>
            {block.text}
          </p>
        </div>
      );
  }
}
