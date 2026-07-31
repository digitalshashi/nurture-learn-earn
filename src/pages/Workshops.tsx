import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Clock, Users, Calendar, Trash2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addWeeks, addMonths, addYears, parseISO, setDay, getDay } from "date-fns";

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

interface WorkshopRow {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  meeting_type: string;
  start_date: string;
  start_time: string;
  duration_minutes: number;
  timezone: string;
  is_recurring: boolean;
  enable_waiting_room: boolean;
  auto_recording: boolean;
  auto_upload_to_course: boolean;
  status: string;
  created_at: string;
}

interface OccurrenceRow {
  id: string;
  workshop_id: string;
  occurrence_number: number;
  total_occurrences: number | null;
  start_time: string;
  end_time: string;
  status: string;
}

const defaultForm = {
  title: "",
  description: "",
  meeting_link: "",
  meeting_type: "zoom",
  start_date: "",
  start_time: "",
  duration_minutes: 60,
  timezone: "ist",
  is_recurring: false,
  enable_waiting_room: false,
  auto_recording: true,
  auto_upload_to_course: false,
  // Recurrence
  frequency: "does_not_repeat",
  interval_value: 1,
  days_of_week: [] as string[],
  month_option: "day", // day or weekday
  month_day: 1,
  month_week: "1st",
  month_weekday: "mon",
  end_type: "never",
  end_date: "",
  occurrence_count: 10,
};

export default function Workshops() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([]);
  const [occurrenceCounts, setOccurrenceCounts] = useState<Record<string, number>>({});
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const loadWorkshops = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workshops")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setWorkshops((data as WorkshopRow[]) || []);

    // Load occurrence counts
    if (data && data.length > 0) {
      const ids = data.map((w: any) => w.id);
      const { data: occs } = await supabase
        .from("workshop_occurrences")
        .select("workshop_id, id")
        .in("workshop_id", ids);
      const counts: Record<string, number> = {};
      (occs || []).forEach((o: any) => {
        counts[o.workshop_id] = (counts[o.workshop_id] || 0) + 1;
      });
      setOccurrenceCounts(counts);

      // Load attendee counts per workshop
      const occIds = (occs || []).map((o: any) => o.id);
      if (occIds.length > 0) {
        const { data: att } = await supabase
          .from("workshop_attendees")
          .select("occurrence_id")
          .in("occurrence_id", occIds);
        const attByWorkshop: Record<string, Set<string>> = {};
        (occs || []).forEach((o: any) => {
          if (!attByWorkshop[o.workshop_id]) attByWorkshop[o.workshop_id] = new Set();
        });
        (att || []).forEach((a: any) => {
          const occ = (occs || []).find((o: any) => o.id === a.occurrence_id);
          if (occ) attByWorkshop[occ.workshop_id]?.add(a.occurrence_id);
        });
        const attCounts: Record<string, number> = {};
        Object.entries(attByWorkshop).forEach(([wid, set]) => { attCounts[wid] = set.size; });
        setAttendeeCounts(attCounts);
      }
    }
  };

  useEffect(() => { loadWorkshops(); }, [user]);

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const generateOccurrences = (workshopId: string, meetingLink: string | null): Array<{
    workshop_id: string;
    occurrence_number: number;
    total_occurrences: number;
    start_time: string;
    end_time: string;
    status: string;
    meeting_link: string | null;
  }> => {
    const baseDate = new Date(form.start_date + "T" + form.start_time);
    const durationMs = form.duration_minutes * 60 * 1000;

    if (form.frequency === "does_not_repeat") {
      return [{
        workshop_id: workshopId,
        occurrence_number: 1,
        total_occurrences: 1,
        start_time: baseDate.toISOString(),
        end_time: new Date(baseDate.getTime() + durationMs).toISOString(),
        status: "upcoming",
        meeting_link: meetingLink,
      }];
    }

    const occurrences: Array<{
      workshop_id: string;
      occurrence_number: number;
      total_occurrences: number;
      start_time: string;
      end_time: string;
      status: string;
      meeting_link: string | null;
    }> = [];
    const maxOccurrences = form.end_type === "after_occurrences" ? form.occurrence_count : 52;
    const endDate = form.end_type === "on_date" && form.end_date ? new Date(form.end_date) : null;

    let currentDate = new Date(baseDate);
    let count = 0;

    const addOccurrence = (date: Date) => {
      if (endDate && date > endDate) return false;
      if (count >= maxOccurrences) return false;
      count++;
      occurrences.push({
        workshop_id: workshopId,
        occurrence_number: count,
        total_occurrences: 0, // will be updated
        start_time: date.toISOString(),
        end_time: new Date(date.getTime() + durationMs).toISOString(),
        status: "upcoming",
        meeting_link: meetingLink,
      });
      return true;
    };

    if (form.frequency === "daily") {
      for (let i = 0; i < maxOccurrences * 2 && count < maxOccurrences; i++) {
        const d = addDays(baseDate, i * form.interval_value);
        if (endDate && d > endDate) break;
        // If specific days selected, filter
        if (form.days_of_week.length > 0) {
          const dayKey = DAYS.find(day => day.dayIndex === getDay(d))?.key;
          if (!dayKey || !form.days_of_week.includes(dayKey)) continue;
        }
        if (!addOccurrence(d)) break;
      }
    } else if (form.frequency === "weekly" || form.frequency === "custom") {
      const selectedDayIndices = form.days_of_week.length > 0
        ? form.days_of_week.map(dk => DAYS.find(d => d.key === dk)!.dayIndex)
        : [getDay(baseDate)];

      let weekStart = baseDate;
      for (let w = 0; w < maxOccurrences * 4 && count < maxOccurrences; w++) {
        const currentWeekStart = addWeeks(baseDate, w * form.interval_value);
        for (const dayIdx of selectedDayIndices.sort((a, b) => a - b)) {
          const d = setDay(currentWeekStart, dayIdx, { weekStartsOn: 1 });
          if (d < baseDate) continue;
          if (endDate && d > endDate) break;
          // Set the time from start_time
          d.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
          if (!addOccurrence(d)) break;
        }
        if (endDate && currentWeekStart > endDate) break;
      }
    } else if (form.frequency === "monthly") {
      for (let m = 0; m < maxOccurrences * 2 && count < maxOccurrences; m++) {
        const d = addMonths(baseDate, m * form.interval_value);
        if (form.month_option === "day") {
          d.setDate(Math.min(form.month_day, 28));
        }
        if (endDate && d > endDate) break;
        if (!addOccurrence(d)) break;
      }
    } else if (form.frequency === "yearly") {
      for (let y = 0; y < maxOccurrences && count < maxOccurrences; y++) {
        const d = addYears(baseDate, y * form.interval_value);
        if (endDate && d > endDate) break;
        if (!addOccurrence(d)) break;
      }
    }

    // Update total_occurrences
    const total = occurrences.length;
    occurrences.forEach(o => { o.total_occurrences = total; });

    return occurrences;
  };

  const handleCreate = async () => {
    if (!user || !form.title || !form.start_date || !form.start_time) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Insert workshop
    const { data: workshop, error } = await supabase.from("workshops").insert({
      created_by: user.id,
      title: form.title,
      description: form.description || null,
      meeting_link: form.meeting_link || null,
      meeting_type: form.meeting_type,
      start_date: form.start_date,
      start_time: form.start_time,
      duration_minutes: form.duration_minutes,
      timezone: form.timezone.toUpperCase(),
      is_recurring: form.frequency !== "does_not_repeat",
      enable_waiting_room: form.enable_waiting_room,
      auto_recording: form.auto_recording,
      auto_upload_to_course: form.auto_upload_to_course,
    } as any).select().single();

    if (error || !workshop) {
      toast({ title: "Error creating workshop", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const wid = (workshop as any).id;

    // Insert recurrence rule if recurring
    if (form.frequency !== "does_not_repeat") {
      await supabase.from("workshop_recurrence_rules").insert({
        workshop_id: wid,
        frequency: form.frequency,
        interval_value: form.interval_value,
        days_of_week: form.days_of_week,
        month_day: form.month_option === "day" ? form.month_day : null,
        month_week_day: form.month_option === "weekday" ? `${form.month_week}_${form.month_weekday}` : null,
        end_type: form.end_type,
        end_date: form.end_type === "on_date" ? form.end_date : null,
        occurrence_count: form.end_type === "after_occurrences" ? form.occurrence_count : null,
      } as any);
    }

    // Generate occurrences
    const occurrences = generateOccurrences(wid, form.meeting_link || null);
    if (occurrences.length > 0) {
      const { error: occError } = await supabase.from("workshop_occurrences").insert(occurrences as any);
      if (occError) {
        toast({ title: "Warning", description: "Workshop created but some occurrences failed to generate.", variant: "destructive" });
      }
    }

    toast({ title: "Workshop created!", description: `${occurrences.length} occurrence(s) generated.` });
    setOpen(false);
    setForm({ ...defaultForm });
    loadWorkshops();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("workshops").delete().eq("id", id);
    toast({ title: "Workshop deleted" });
    loadWorkshops();
  };

  const filtered = workshops.filter(w => w.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Workshops</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Create Workshop
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Workshop</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Title */}
                <div>
                  <Label>Workshop Title</Label>
                  <Input placeholder="e.g. Growth Hacking Masterclass" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                </div>

                {/* Duration & Timezone */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} /></div>
                  <div>
                    <Label>Timezone</Label>
                    <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ist">IST</SelectItem>
                        <SelectItem value="est">EST</SelectItem>
                        <SelectItem value="pst">PST</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="gmt">GMT</SelectItem>
                        <SelectItem value="cst">CST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Meeting Link */}
                <div>
                  <Label>Zoom / Meeting Link</Label>
                  <Input placeholder="https://zoom.us/j/..." value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
                </div>

                {/* Description */}
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Workshop description..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                {/* Settings & Recurring */}
                <div className="space-y-3 border-t border-border pt-3">
                  {/* Recurring Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Recurring Workshop</Label>
                    <Switch
                      checked={form.frequency !== "does_not_repeat"}
                      onCheckedChange={(checked) => setForm({ ...form, frequency: checked ? "weekly" : "does_not_repeat" })}
                    />
                  </div>

                  {/* Recurrence Settings */}
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

                      {/* Interval */}
                      {form.frequency === "custom" && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                          <Input
                            type="number"
                            min={1}
                            className="w-16"
                            value={form.interval_value}
                            onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })}
                          />
                          <span className="text-xs text-muted-foreground">week(s)</span>
                        </div>
                      )}

                      {/* Weekly / Custom: Day selection */}
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

                      {/* Daily: Day checkboxes */}
                      {form.frequency === "daily" && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                            <Input
                              type="number"
                              min={1}
                              className="w-16"
                              value={form.interval_value}
                              onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })}
                            />
                            <span className="text-xs text-muted-foreground">day(s)</span>
                          </div>
                          <Label className="text-xs text-muted-foreground mb-2 block">On specific days (optional)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {DAYS.map((day) => (
                              <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                  checked={form.days_of_week.includes(day.key)}
                                  onCheckedChange={() => toggleDay(day.key)}
                                />
                                <span className="text-sm">{day.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Monthly options */}
                      {form.frequency === "monthly" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Repeat every</Label>
                            <Input
                              type="number"
                              min={1}
                              className="w-16"
                              value={form.interval_value}
                              onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })}
                            />
                            <span className="text-xs text-muted-foreground">month(s)</span>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="month_option"
                                checked={form.month_option === "day"}
                                onChange={() => setForm({ ...form, month_option: "day" })}
                                className="accent-[hsl(var(--accent))]"
                              />
                              <span className="text-sm">On day</span>
                              <Input
                                type="number"
                                min={1}
                                max={31}
                                className="w-16"
                                value={form.month_day}
                                onChange={(e) => setForm({ ...form, month_day: parseInt(e.target.value) || 1 })}
                                disabled={form.month_option !== "day"}
                              />
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                              <input
                                type="radio"
                                name="month_option"
                                checked={form.month_option === "weekday"}
                                onChange={() => setForm({ ...form, month_option: "weekday" })}
                                className="accent-[hsl(var(--accent))]"
                              />
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
                          <Input
                            type="number"
                            min={1}
                            className="w-16"
                            value={form.interval_value}
                            onChange={(e) => setForm({ ...form, interval_value: parseInt(e.target.value) || 1 })}
                          />
                          <span className="text-xs text-muted-foreground">year(s)</span>
                        </div>
                      )}

                      {/* End options */}
                      <div className="border-t border-border pt-2 space-y-2">
                        <Label className="text-xs text-muted-foreground block">Ends</Label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="end_type" checked={form.end_type === "never"} onChange={() => setForm({ ...form, end_type: "never" })} className="accent-[hsl(var(--accent))]" />
                            <span className="text-sm">Never</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="end_type" checked={form.end_type === "on_date"} onChange={() => setForm({ ...form, end_type: "on_date" })} className="accent-[hsl(var(--accent))]" />
                            <span className="text-sm">On</span>
                            <Input
                              type="date"
                              className="w-40"
                              value={form.end_date}
                              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                              disabled={form.end_type !== "on_date"}
                            />
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="end_type" checked={form.end_type === "after_occurrences"} onChange={() => setForm({ ...form, end_type: "after_occurrences" })} className="accent-[hsl(var(--accent))]" />
                            <span className="text-sm">After</span>
                            <Input
                              type="number"
                              className="w-16"
                              min={1}
                              value={form.occurrence_count}
                              onChange={(e) => setForm({ ...form, occurrence_count: parseInt(e.target.value) || 10 })}
                              disabled={form.end_type !== "after_occurrences"}
                            />
                            <span className="text-sm">occurrences</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other settings */}
                  <div className="flex items-center justify-between">
                    <Label>Enable Waiting Room</Label>
                    <Switch checked={form.enable_waiting_room} onCheckedChange={(v) => setForm({ ...form, enable_waiting_room: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto Recording</Label>
                    <Switch checked={form.auto_recording} onCheckedChange={(v) => setForm({ ...form, auto_recording: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto-upload to Course</Label>
                    <Switch checked={form.auto_upload_to_course} onCheckedChange={(v) => setForm({ ...form, auto_upload_to_course: v })} />
                  </div>
                </div>

                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Workshop"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Video className="h-5 w-5 text-accent" /></div>
              <div><p className="text-2xl font-bold">{workshops.length}</p><p className="text-xs text-muted-foreground">Total Workshops</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Calendar className="h-5 w-5 text-success" /></div>
              <div><p className="text-2xl font-bold">{Object.values(occurrenceCounts).reduce((a, b) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Total Occurrences</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div>
              <div><p className="text-2xl font-bold">{workshops.filter(w => w.is_recurring).length}</p><p className="text-xs text-muted-foreground">Recurring</p></div>
            </CardContent>
          </Card>
        </div>

        <Input placeholder="Search workshops..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No workshops yet. Create your first one!</p>
            </div>
          ) : filtered.map((w) => (
            <Card key={w.id} className="card-shadow hover:card-shadow-hover transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-accent/10"><Video className="h-5 w-5 text-accent" /></div>
                  <div className="flex items-center gap-1.5">
                    {w.is_recurring && <Badge variant="outline" className="text-[10px]">Recurring</Badge>}
                    <Badge variant="default" className="bg-success text-success-foreground text-[10px]">
                      {w.status}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-2">{w.title}</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(parseISO(w.start_date), "MMM d, yyyy")} at {w.start_time}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />{w.duration_minutes} min • {w.timezone}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" />{occurrenceCounts[w.id] || 0} occurrence(s)
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                  {w.meeting_link && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => window.open(w.meeting_link!, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Join
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive ml-auto" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
