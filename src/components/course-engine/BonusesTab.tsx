import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileDown, Wand2 } from "lucide-react";
import {
  suggestBonus,
  toInput,
  type Bonus,
  type BonusSlot,
  type CoursePayload,
} from "@/lib/courseEngine";
import { SlotField, type SlotSuggestion } from "./SlotField";

const SLOT_LABEL: Record<BonusSlot, string> = {
  context: "V1 Context — why this matters",
  content: "V2 Content — the teaching and the download",
  next: "V3 Next Steps — what to do now",
};

interface BonusesTabProps {
  payload: CoursePayload;
  onChange: (payload: CoursePayload) => void;
  requestSlotSuggestion?: (
    target: { kind: "bonus"; number: number; slot: BonusSlot },
    existing: { title: string; covers: string },
  ) => Promise<SlotSuggestion | null>;
}

/**
 * Six side-courses, three videos and one download each.
 *
 * The topic and the resource are editable — a niche can genuinely need a
 * different support than "Funnels" — but the count and the three-video shape
 * are not, because the price ladder depends on each bonus being a separable
 * piece of value.
 */
export function BonusesTab({ payload, onChange, requestSlotSuggestion }: BonusesTabProps) {
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const ctx = { input: toInput(payload), steps: payload.steps };

  const patchBonus = (number: number, patch: Partial<Bonus>) =>
    onChange({
      ...payload,
      bonuses: payload.bonuses.map((bonus) =>
        bonus.number === number ? { ...bonus, ...patch } : bonus,
      ),
    });

  const patchVideo = (
    number: number,
    slot: BonusSlot,
    patch: { title?: string; covers?: string },
  ) => {
    const bonus = payload.bonuses.find((entry) => entry.number === number);
    if (!bonus) return;
    patchBonus(number, {
      videos: bonus.videos.map((video) => (video.slot === slot ? { ...video, ...patch } : video)),
    });
  };

  const fillFromFormula = (number: number) => {
    const bonus = payload.bonuses.find((entry) => entry.number === number);
    if (!bonus) return;
    const suggestion = suggestBonus(ctx, number);
    patchBonus(number, {
      purpose: bonus.purpose.trim() || suggestion.purpose,
      videos: bonus.videos.map((video) => {
        const suggested = suggestion.videos.find((entry) => entry.slot === video.slot);
        return {
          ...video,
          title: video.title.trim() || suggested?.title || "",
          covers: video.covers.trim() || suggested?.covers || "",
        };
      }),
    });
  };

  const askAi = async (number: number, slot: BonusSlot, existing: { title: string; covers: string }) => {
    if (!requestSlotSuggestion) return;
    const key = `${number}-${slot}`;
    setBusySlot(key);
    try {
      const suggestion = await requestSlotSuggestion({ kind: "bonus", number, slot }, existing);
      if (suggestion) {
        patchVideo(number, slot, {
          title: suggestion.title || existing.title,
          covers: suggestion.covers || existing.covers,
        });
      }
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <div className="space-y-4">
      {payload.bonuses.map((bonus) => {
        const suggestion = suggestBonus(ctx, bonus.number);
        const written = bonus.videos.filter((video) => video.title.trim()).length;

        return (
          <Card key={bonus.number} className="card-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Bonus {bonus.number}
                  <Badge variant={written === 3 ? "secondary" : "outline"} className="font-normal">
                    {written}/3 written
                  </Badge>
                </CardTitle>
                {written < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillFromFormula(bonus.number)}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                    Fill the empty slots
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Bonus topic</label>
                  <Input
                    value={bonus.topic}
                    onChange={(event) => patchBonus(bonus.number, { topic: event.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileDown className="h-3 w-3" />
                    Downloadable resource
                  </label>
                  <Input
                    value={bonus.resource.name}
                    onChange={(event) =>
                      patchBonus(bonus.number, {
                        resource: { ...bonus.resource, name: event.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">What this bonus is for</label>
                <Input
                  value={bonus.purpose}
                  placeholder={suggestion.purpose}
                  onChange={(event) => patchBonus(bonus.number, { purpose: event.target.value })}
                />
              </div>

              {bonus.videos.map((video) => (
                <SlotField
                  key={video.slot}
                  lockedLabel={SLOT_LABEL[video.slot]}
                  title={video.title}
                  covers={video.covers}
                  suggestion={suggestion.videos.find((entry) => entry.slot === video.slot)}
                  onChange={(patch) => patchVideo(bonus.number, video.slot, patch)}
                  onAskAi={
                    requestSlotSuggestion
                      ? () =>
                          askAi(bonus.number, video.slot, {
                            title: video.title,
                            covers: video.covers,
                          })
                      : undefined
                  }
                  aiBusy={busySlot === `${bonus.number}-${video.slot}`}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
