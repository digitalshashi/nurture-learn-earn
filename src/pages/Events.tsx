import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, DollarSign, Trash2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addWeeks, addMonths, addYears, getDay, setDay } from "date-fns";

const DAYS = [
  { key: "mon", label: "Mon", dayIndex: 1 },
  { key: "tue", label: "Tue", dayIndex: 2 },
  { key: "wed", label: "Wed", dayIndex: 3 },
  { key: "thu", label: "Thu", dayIndex: 4 },
  { key: "fri", label: "Fri", dayIndex: 5 },
  { key: "sat", label: "Sat", dayIndex: 6 },
  { key: "sun", label: "Sun", dayIndex: 0 },
];

const MONTH_WEEK_OPTIONS = [
  { value: "1st", label: "First" },
  { value: "2nd", label: "Second" },
  { value: "3rd", label: "Third" },
  { value: "4th", label: "Fourth" },
  { value: "last", label: "Last" },
];

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  start_time: string;
  end_time: string;
  recurring: boolean;
  recurrence_rule: string | null;
  occurrence_number: number | null;
  total_occurrences: number | null;
  service_id: string | null;
  course_id: string | null;
  status: string;
  meeting_type: string;
}

interface ServiceOption {
  id: string;
  title: string;
}

const defaultForm = {
  title: "",
  description: "",
  meeting_link: "",
  meeting_type: "custom",
  start_time: "",
  end_time: "",
  course_id: "",
  // Recurrence
  frequency: "does_not_repeat",
  interval_value: 1,
  days_of_week: [] as string[],
  month_option: "day",
  month_day: 1,
  month_week: "1st",
  month_weekday: "mon",
  end_type: "never",
  end_date: "",
  occurrence_count: 10,
};

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const loadData = async () => {
    if (!user) return;
    const [evRes, cRes] = await Promise.all([
      supabase.from("events").select("*").eq("created_by", user.id).order("start_time", { ascending: false }),
      supabase.from("courses").select("id, title").eq("coach_id", user.id),
    ]);
    setEvents(evRes.data || []);
    setCourses(cRes.data || []);
  };

  useEffect(() => { loadData(); }, [user]);

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const generateOccurrences = () => {
    if (!form.start_time || !form.end_time) return [];
    const baseStart = new Date(form.start_time);
    const baseEnd = new Date(form.end_time);
    const durationMs = baseEnd.getTime() - baseStart.getTime();

    if (form.frequency === "does_not_repeat") {
      return [{ start: baseStart, end: baseEnd, num: 1, total: 1 }];
    }

    const results: Array<{ start: Date; end: Date; num: number; total: number }> = [];
    const maxOcc = form.end_type === "after_occurrences" ? form.occurrence_count : 52;
    const endDate = form.end_type === "on_date" && form.end_date ? new Date(form.end_date) : null;
    let count = 0;

    const add = (d: Date) => {
      if (endDate && d > endDate) return false;
      if (count >= maxOcc) return false;
      count++;
      results.push({ start: d, end: new Date(d.getTime() + durationMs), num: count, total: 0 });
      return true;
    };

    if (form.frequency === "daily") {
      for (let i = 0; count < maxOcc && i < maxOcc * 2; i++) {
        const d = addDays(baseStart, i * form.interval_value);
        if (endDate && d > endDate) break;
        if (form.days_of_week.length > 0) {
          const dayKey = DAYS.find(day => day.dayIndex === getDay(d))?.key;
          if (!dayKey || !form.days_of_week.includes(dayKey)) continue;
        }
        if (!add(d)) break;
      }
    } else if (form.frequency === "weekly" || form.frequency === "custom") {
      const selectedDayIndices = form.days_of_week.length > 0
        ? form.days_of_week.map(dk => DAYS.find(d => d.key === dk)!.dayIndex)
        : [getDay(baseStart)];
      for (let w = 0; count < maxOcc && w < maxOcc * 4; w++) {
        const weekStart = addWeeks(baseStart, w * form.interval_value);
        for (const dayIdx of selectedDayIndices.sort((a, b) => a - b)) {
          const d = setDay(weekStart, dayIdx, { weekStartsOn: 1 });
          if (d < baseStart) continue;
          if (endDate && d > endDate) break;
          d.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          if (!add(d)) break;
        }
        if (endDate && weekStart > endDate) break;
      }
    } else if (form.frequency === "monthly") {
      for (let m = 0; count < maxOcc && m < maxOcc * 2; m++) {
        const d = addMonths(baseStart, m * form.interval_value);
        if (form.month_option === "day") d.setDate(Math.min(form.month_day, 28));
        if (endDate && d > endDate) break;
        if (!add(d)) break;
      }
    } else if (form.frequency === "yearly") {
      for (let y = 0; count < maxOcc; y++) {
        const d = addYears(baseStart, y * form.interval_value);
        if (endDate && d > endDate) break;
        if (!add(d)) break;
      }
    }

    const total = results.length;
    results.forEach(r => { r.total = total; });
    return results;
  };

  const handleCreate = async () => {
    if (!user || !form.title || !form.start_time || !form.end_time) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    const isRecurring = form.frequency !== "does_not_repeat";
    const occurrences = generateOccurrences();
    const recurrenceRule = isRecurring
      ? JSON.stringify({ frequency: form.frequency, interval: form.interval_value, days_of_week: form.days_of_week, end_type: form.end_type, end_date: form.end_date, occurrence_count: form.occurrence_count })
      : null;

    // Insert all occurrences as individual events
    const inserts = occurrences.map((occ) => ({
      title: form.title,
      description: form.description || null,
      meeting_link: form.meeting_link || null,
      meeting_type: form.meeting_type,
      start_time: occ.start.toISOString(),
      end_time: occ.end.toISOString(),
      course_id: form.course_id || null,
      recurring: isRecurring,
      recurrence_rule: recurrenceRule,
      total_occurrences: occ.total,
      occurrence_number: occ.num,
      created_by: user.id,
    }));

    const { error } = await supabase.from("events").insert(inserts);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event created!", description: `${occurrences.length} occurrence(s) generated.` });
      setOpen(false);
      setForm({ ...defaultForm });
      loadData();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "Event deleted" });
    loadData();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Events & Consultations</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Create Event</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Event Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Leadership Council Call" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Time</Label><Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div><Label>Meeting Type</Label>
                  <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom Meeting</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Meeting Link</Label><Input value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} placeholder="https://..." /></div>
                <div><Label>Linked Course (optional)</Label>
                  <Select value={form.course_id || "none"} onValueChange={(v) => setForm({ ...form, course_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="None (visible to all)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>

                {/* Recurring Settings */}
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Recurring Event</Label>
                    <Switch
                      checked={form.frequency !== "does_not_repeat"}
                      onCheckedChange={(checked) => setForm({ ...form, frequency: checked ? "weekly" : "does_not_repeat" })}
                    />
                  </div>

                  {form.frequency !== "does_not_repeat" && (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                      {/* Frequency */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Repeats</Label>
                        <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom interval */}
                      {form.frequency === "custom" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                          <Input type="number" min={1} className="w-16" value={form.interval_value} onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })} />
                          <span className="text-xs text-muted-foreground">week(s)</span>
                        </div>
                      )}

                      {/* Weekly / Custom day selection */}
                      {(form.frequency === "weekly" || form.frequency === "custom") && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">Repeat on</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {DAYS.map((day) => (
                              <button
                                key={day.key}
                                type="button"
                                onClick={() => toggleDay(day.key)}
                                className={`h-9 w-10 rounded-full text-xs font-medium border transition-colors ${
                                  form.days_of_week.includes(day.key)
                                    ? "bg-accent text-accent-foreground border-accent"
                                    : "bg-background text-muted-foreground border-border hover:border-accent/50"
                                }`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Daily */}
                      {form.frequency === "daily" && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                            <Input type="number" min={1} className="w-16" value={form.interval_value} onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })} />
                            <span className="text-xs text-muted-foreground">day(s)</span>
                          </div>
                          <Label className="text-xs text-muted-foreground mb-2 block">On specific days (optional)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {DAYS.map((day) => (
                              <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={form.days_of_week.includes(day.key)} onCheckedChange={() => toggleDay(day.key)} />
                                <span className="text-sm">{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Monthly */}
                      {form.frequency === "monthly" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                            <Input type="number" min={1} className="w-16" value={form.interval_value} onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })} />
                            <span className="text-xs text-muted-foreground">month(s)</span>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name="ev_month_option" checked={form.month_option === "day"} onChange={() => setForm({ ...form, month_option: "day" })} className="accent-[hsl(var(--accent))]" />
                              <span className="text-sm">On day</span>
                              <Input type="number" min={1} max={31} className="w-16" value={form.month_day} onChange={(e) => setForm({ ...form, month_day: parseInt(e.target.value) || 1 })} disabled={form.month_option !== "day"} />
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                              <input type="radio" name="ev_month_option" checked={form.month_option === "weekday"} onChange={() => setForm({ ...form, month_option: "weekday" })} className="accent-[hsl(var(--accent))]" />
                              <span className="text-sm">On the</span>
                              <Select value={form.month_week} onValueChange={(v) => setForm({ ...form, month_week: v })} disabled={form.month_option !== "weekday"}>
                                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MONTH_WEEK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select value={form.month_weekday} onValueChange={(v) => setForm({ ...form, month_weekday: v })} disabled={form.month_option !== "weekday"}>
                                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {DAYS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Yearly */}
                      {form.frequency === "yearly" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                          <Input type="number" min={1} className="w-16" value={form.interval_value} onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })} />
                          <span className="text-xs text-muted-foreground">year(s)</span>
                        </div>
                      )}

                      {/* End options */}
                      <div className="border-t border-border pt-2 space-y-2">
                        <Label className="text-xs text-muted-foreground block">Ends</Label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="ev_end_type" checked={form.end_type === "never"} onChange={() => setForm({ ...form, end_type: "never" })} className="accent-[hsl(var(--accent))]" />
                            <span className="text-sm">Never</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="ev_end_type" checked={form.end_type === "on_date"} onChange={() => setForm({ ...form, end_type: "on_date" })} className="accent-[hsl(var(--accent))]" />
                            <span className="text-sm">On</span>
                            <Input type="date" className="w-40" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} disabled={form.end_type !== "on_date"} />
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="ev_end_type" checked={form.end_type === "after_occurrences"} onChange={() => setForm({ ...form, end_type: "after_occurrences" })} className="accent-[hsl(var(--accent))]" />
                            <span className="text-sm">After</span>
                            <Input type="number" className="w-16" min={1} value={form.occurrence_count} onChange={(e) => setForm({ ...form, occurrence_count: parseInt(e.target.value) || 10 })} disabled={form.end_type !== "after_occurrences"} />
                            <span className="text-sm">occurrences</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Calendar className="h-5 w-5 text-info" /></div>
              <div><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground">Total Events</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Clock className="h-5 w-5 text-success" /></div>
              <div><p className="text-2xl font-bold">{events.filter(e => e.status === "upcoming").length}</p><p className="text-xs text-muted-foreground">Upcoming</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><DollarSign className="h-5 w-5 text-accent" /></div>
              <div><p className="text-2xl font-bold">{events.filter(e => e.recurring).length}</p><p className="text-xs text-muted-foreground">Recurring</p></div>
            </CardContent>
          </Card>
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">All Events</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Occurrence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No events yet. Create your first event.</TableCell></TableRow>
                ) : events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium text-sm">{ev.title}</TableCell>
                    <TableCell className="text-sm capitalize">{ev.meeting_type.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">{format(new Date(ev.start_time), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="text-sm">{format(new Date(ev.end_time), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="text-sm">
                      {ev.recurring ? (
                        <span>{ev.occurrence_number}/{ev.total_occurrences}</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">One-time</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{ev.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {ev.meeting_link && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(ev.meeting_link!, "_blank")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ev.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
