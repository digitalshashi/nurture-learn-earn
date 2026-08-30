import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Plus, Trash2, Wand2 } from "lucide-react";
import {
  stepCoverage,
  suggestLive,
  toInput,
  uncoveredSteps,
  type CoursePayload,
  type LiveSession,
} from "@/lib/courseEngine";

interface LiveTabProps {
  payload: CoursePayload;
  onChange: (payload: CoursePayload) => void;
}

/**
 * The implementation half of the programme, and the only tab where a missing
 * row is a real problem rather than an unfinished one.
 *
 * A step with no live session is the defect nobody notices until a student
 * asks about it halfway through, so coverage is shown as a permanent strip
 * rather than as a validation message they have to go looking for.
 */
export function LiveTab({ payload, onChange }: LiveTabProps) {
  const [planText, setPlanText] = useState("");
  const coverage = stepCoverage(payload);
  const uncovered = uncoveredSteps(payload);

  const setSessions = (sessions: LiveSession[], source: "generated" | "coach" = payload.live.source) =>
    onChange({ ...payload, live: { ...payload.live, source, sessions } });

  const patchSession = (index: number, patch: Partial<LiveSession>) =>
    setSessions(payload.live.sessions.map((session, i) => (i === index ? { ...session, ...patch } : session)));

  const addSession = () =>
    setSessions([
      ...payload.live.sessions,
      {
        day: (payload.live.sessions.at(-1)?.day ?? 0) + 1,
        step_ref: uncovered[0] ?? 1,
        title: "",
        taught: "",
        outcome: "",
      },
    ]);

  const planFromFormula = () => {
    const suggested = suggestLive({ input: { ...toInput(payload), live_plan: undefined }, steps: payload.steps });
    setSessions(suggested.sessions, "generated");
  };

  /** Keeps the coach's own days verbatim and only tags each with a step. */
  const importPlan = () => {
    const lines = planText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    const tagged = suggestLive({ input: { ...toInput(payload), live_plan: lines }, steps: payload.steps });
    setSessions(tagged.sessions, "coach");
    setPlanText("");
  };

  return (
    <div className="space-y-4">
      <Card className="card-shadow">
        <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">Include 12 days of live classes</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Two sessions per transformation step. Switched off, this is a recorded programme —
              the days, the bonuses and the vault — and nothing here is published or exported.
            </p>
          </div>
          <Switch
            checked={payload.live.included}
            onCheckedChange={(included) =>
              onChange({ ...payload, live: { ...payload.live, included } })
            }
            aria-label="Include live classes"
          />
        </CardContent>
      </Card>

      {!payload.live.included ? (
        <p className="text-sm text-muted-foreground">
          Live classes are off. Switch them back on to plan the schedule.
        </p>
      ) : (
      <>
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Step coverage</CardTitle>
          <CardDescription>Every step needs at least one session that builds it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {payload.steps.map((step) => {
              const count = coverage.get(step.number) ?? 0;
              return (
                <Badge
                  key={step.number}
                  variant={count === 0 ? "destructive" : "secondary"}
                  className="font-normal"
                >
                  {step.number}. {step.name} — {count} session{count === 1 ? "" : "s"}
                </Badge>
              );
            })}
          </div>

          {uncovered.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                No live session builds{" "}
                {uncovered
                  .map((number) => payload.steps.find((step) => step.number === number)?.name ?? `step ${number}`)
                  .join(", ")}
                . Students reach that step with nothing scheduled.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">
                Sessions
                <Badge variant="outline" className="ml-2 font-normal">
                  {payload.live.source === "coach" ? "Your own plan" : "Built from the steps"}
                </Badge>
              </CardTitle>
              <CardDescription>
                One to three sessions per step. Each produces one finished thing.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={planFromFormula}>
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                Plan from the steps
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addSession}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add session
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {payload.live.sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Plan them from the six steps, or paste a schedule you already run below.
            </p>
          )}

          {payload.live.sessions.map((session, index) => (
            <div key={index} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={session.day}
                  onChange={(event) => patchSession(index, { day: Number(event.target.value) || 1 })}
                  className="w-20"
                  aria-label="Day"
                />
                <Select
                  value={String(session.step_ref)}
                  onValueChange={(value) => patchSession(index, { step_ref: Number(value) })}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payload.steps.map((step) => (
                      <SelectItem key={step.number} value={String(step.number)}>
                        Step {step.number} — {step.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={session.title}
                  placeholder="Class title"
                  onChange={(event) => patchSession(index, { title: event.target.value })}
                  className="flex-1 min-w-[200px]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSessions(payload.live.sessions.filter((_, i) => i !== index))}
                  aria-label="Remove session"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={session.taught}
                placeholder="What is taught in this session"
                rows={2}
                onChange={(event) => patchSession(index, { taught: event.target.value })}
              />
              <Input
                value={session.outcome}
                placeholder="What the student walks out with, finished"
                onChange={(event) => patchSession(index, { outcome: event.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Already run a challenge?</CardTitle>
          <CardDescription>
            Paste your day-by-day plan, one day per line. Your days are kept exactly as written and
            only tagged with the step each one builds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            rows={5}
            value={planText}
            placeholder={"Day 1: pick your niche\nDay 2: set up the profile\nDay 3: first three reels"}
            onChange={(event) => setPlanText(event.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={importPlan} disabled={!planText.trim()}>
            Tag my plan to the steps
          </Button>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
