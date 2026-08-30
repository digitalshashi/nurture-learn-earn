import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import {
  suggestFoundationVideo,
  toInput,
  type CoursePayload,
  type FoundationVideo,
} from "@/lib/courseEngine";
import { SlotField, type SlotSuggestion } from "./SlotField";

interface FoundationTabProps {
  payload: CoursePayload;
  onChange: (payload: CoursePayload) => void;
  /** Returns a suggestion for one slot, or null when the coach has no provider. */
  requestSlotSuggestion?: (
    target: { kind: "foundation"; day: number; slot: number },
    existing: { title: string; covers: string },
  ) => Promise<SlotSuggestion | null>;
}

/** The 3 days, 5 fixed slots each. The slots are labels; only the writing changes. */
export function FoundationTab({ payload, onChange, requestSlotSuggestion }: FoundationTabProps) {
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const ctx = { input: toInput(payload), steps: payload.steps };

  const patchVideo = (day: number, slot: number, patch: Partial<FoundationVideo>) =>
    onChange({
      ...payload,
      foundation: {
        days: payload.foundation.days.map((entry) =>
          entry.day !== day
            ? entry
            : {
                ...entry,
                videos: entry.videos.map((video) =>
                  video.slot === slot ? { ...video, ...patch } : video,
                ),
              },
        ),
      },
    });

  /** Fills only the slots still empty, so nothing the coach wrote is lost. */
  const fillDayFromFormula = (day: number) =>
    onChange({
      ...payload,
      foundation: {
        days: payload.foundation.days.map((entry) =>
          entry.day !== day
            ? entry
            : {
                ...entry,
                videos: entry.videos.map((video) => {
                  if (video.title.trim() && video.covers.trim()) return video;
                  const suggestion = suggestFoundationVideo(ctx, day, video.slot);
                  return {
                    ...video,
                    title: video.title.trim() || suggestion.title,
                    covers: video.covers.trim() || suggestion.covers,
                    learner_actions: video.learner_actions.length
                      ? video.learner_actions
                      : suggestion.learner_actions,
                  };
                }),
              },
        ),
      },
    });

  const askAi = async (day: number, video: FoundationVideo) => {
    if (!requestSlotSuggestion) return;
    const key = `${day}-${video.slot}`;
    setBusySlot(key);
    try {
      const suggestion = await requestSlotSuggestion(
        { kind: "foundation", day, slot: video.slot },
        { title: video.title, covers: video.covers },
      );
      if (suggestion) {
        patchVideo(day, video.slot, {
          title: suggestion.title || video.title,
          covers: suggestion.covers || video.covers,
          learner_actions: suggestion.learner_actions?.length
            ? suggestion.learner_actions
            : video.learner_actions,
        });
      }
    } finally {
      setBusySlot(null);
    }
  };

  const stepBadge = (video: FoundationVideo) => {
    if (video.step_ref === null) return undefined;
    const step = payload.steps.find((entry) => entry.number === video.step_ref);
    return `Teaches Step ${video.step_ref}${step ? ` — ${step.name}` : ""}`;
  };

  return (
    <Accordion type="multiple" defaultValue={["day-1"]} className="space-y-3">
      {payload.foundation.days.map((day) => {
        const written = day.videos.filter((video) => video.title.trim() && video.covers.trim()).length;

        return (
          <AccordionItem
            key={day.day}
            value={`day-${day.day}`}
            className="border border-border rounded-xl px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-wrap items-center gap-2 text-left">
                <span className="font-medium">
                  Day {day.day} — {day.theme}
                </span>
                <Badge variant={written === 5 ? "secondary" : "outline"} className="font-normal">
                  {written}/5 written
                </Badge>
              </div>
            </AccordionTrigger>

            <AccordionContent className="space-y-3 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{day.goal}</p>
                {written < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillDayFromFormula(day.day)}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                    Fill the empty slots
                  </Button>
                )}
              </div>

              {day.videos.map((video) => (
                <SlotField
                  key={video.slot}
                  lockedLabel={`${video.slot}. ${video.slot_purpose}`}
                  stepBadge={stepBadge(video)}
                  title={video.title}
                  covers={video.covers}
                  learnerActions={video.learner_actions}
                  suggestion={suggestFoundationVideo(ctx, day.day, video.slot)}
                  onChange={(patch) => patchVideo(day.day, video.slot, patch)}
                  onAskAi={requestSlotSuggestion ? () => askAi(day.day, video) : undefined}
                  aiBusy={busySlot === `${day.day}-${video.slot}`}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
