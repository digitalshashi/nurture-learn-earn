import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Wand2 } from "lucide-react";
import {
  suggestPositioning,
  suggestValueStack,
  toInput,
  validatePayload,
  type CoursePayload,
} from "@/lib/courseEngine";

interface OverviewTabProps {
  payload: CoursePayload;
  onChange: (payload: CoursePayload) => void;
}

export function OverviewTab({ payload, onChange }: OverviewTabProps) {
  const ctx = { input: toInput(payload), steps: payload.steps };
  const violations = validatePayload(payload);
  const errors = violations.filter((violation) => violation.severity === "error");
  const warnings = violations.filter((violation) => violation.severity === "warning");

  const setMeta = (patch: Partial<CoursePayload["meta"]>) =>
    onChange({ ...payload, meta: { ...payload.meta, ...patch } });

  const setPositioning = (patch: Partial<CoursePayload["positioning"]>) =>
    onChange({ ...payload, positioning: { ...payload.positioning, ...patch } });

  return (
    <div className="space-y-4">
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Course</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Course name</label>
            <Input
              value={payload.meta.course_name}
              onChange={(event) => setMeta({ course_name: event.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Topic</label>
              <Input value={payload.meta.topic} onChange={(event) => setMeta({ topic: event.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Audience</label>
              <Input
                value={payload.meta.audience}
                onChange={(event) => setMeta({ audience: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Where they are today</label>
              <Input
                value={payload.meta.starting_pain}
                onChange={(event) => setMeta({ starting_pain: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Where they want to be</label>
              <Input
                value={payload.meta.desired_result}
                onChange={(event) => setMeta({ desired_result: event.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Positioning</CardTitle>
              <CardDescription>Why this course exists, in your own words.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...payload, positioning: suggestPositioning(ctx) })}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Suggest
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">The pain</label>
            <Textarea
              rows={2}
              value={payload.positioning.pain_statement}
              placeholder="I do not want anyone else to go through..."
              onChange={(event) => setPositioning({ pain_statement: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">The mission</label>
            <Textarea
              rows={2}
              value={payload.positioning.mission_statement}
              placeholder="My mission is to help..."
              onChange={(event) => setPositioning({ mission_statement: event.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">The army</label>
            <Textarea
              rows={2}
              value={payload.positioning.army_statement}
              placeholder="I want to create an army of..."
              onChange={(event) => setPositioning({ army_statement: event.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Value stack</CardTitle>
              <CardDescription>
                What each part of the offer is. The engine never fills in a price — that number is
                yours to decide.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...payload,
                  value_stack: suggestValueStack(ctx, payload.live.sessions.length).map((item) => ({
                    ...item,
                    stated_value:
                      payload.value_stack.find((existing) => existing.item === item.item)?.stated_value ??
                      null,
                  })),
                })
              }
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Suggest
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {payload.value_stack.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          )}
          {payload.value_stack.map((item, index) => (
            <div key={item.item} className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="w-32 justify-center font-normal">
                {item.item}
              </Badge>
              <Input
                value={item.description}
                className="flex-1 min-w-[200px]"
                onChange={(event) =>
                  onChange({
                    ...payload,
                    value_stack: payload.value_stack.map((entry, i) =>
                      i === index ? { ...entry, description: event.target.value } : entry,
                    ),
                  })
                }
              />
              <Input
                type="number"
                min={0}
                placeholder="Value"
                value={item.stated_value ?? ""}
                className="w-28"
                onChange={(event) =>
                  onChange({
                    ...payload,
                    value_stack: payload.value_stack.map((entry, i) =>
                      i === index
                        ? { ...entry, stated_value: event.target.value === "" ? null : Number(event.target.value) }
                        : entry,
                    ),
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Checks</CardTitle>
          <CardDescription>
            Run against the format on every change, so nothing breaks quietly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {errors.length === 0 && warnings.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm">
                The blueprint is complete and matches the format. Ready to publish.
              </AlertDescription>
            </Alert>
          )}

          {errors.map((violation, index) => (
            <Alert key={`error-${index}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{violation.message}</AlertDescription>
            </Alert>
          ))}

          {warnings.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {warnings.length} thing{warnings.length === 1 ? "" : "s"} still to do
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                {warnings.slice(0, 12).map((violation, index) => (
                  <li key={`warning-${index}`}>{violation.message}</li>
                ))}
              </ul>
              {warnings.length > 12 && (
                <p className="text-xs text-muted-foreground">and {warnings.length - 12} more.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
