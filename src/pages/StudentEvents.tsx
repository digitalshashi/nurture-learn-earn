import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  CalendarCheck,
  Clock,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Copy,
  CalendarPlus,
  Video,
  Check,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, isAfter, parseISO, isToday, isTomorrow, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { appLink, notify } from "@/lib/notify";
import { safeUrl } from "@/lib/safeUrl";
import { useTabParam } from "@/hooks/useTabParam";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  meeting_type: string;
  start_time: string;
  end_time: string;
  recurring: boolean;
  occurrence_number: number | null;
  total_occurrences: number | null;
  source: "event" | "workshop";
  registered: boolean;
}

type Phase = "live" | "upcoming" | "completed";

const phaseOf = (ev: EventItem, now: Date): Phase => {
  if (isBefore(parseISO(ev.end_time), now)) return "completed";
  if (isAfter(parseISO(ev.start_time), now)) return "upcoming";
  return "live";
};

/** "Today", "Tomorrow", else a written date — friendlier than a bare date. */
const dayLabel = (iso: string) => {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
};

export default function StudentEvents() {
  // Section lives in the URL so links, refreshes and analytics all point
  // at the section actually being viewed.
  const [activeTab, setActiveTab] = useTabParam(["upcoming", "mine", "completed"] as const);
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Keyed on the id, not the user object: a provider that hands back a fresh
  // object each render would otherwise rebuild this callback every time, and
  // the effect below would refetch in a loop.
  const userId = user?.id;

  const loadEvents = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [
      { data: enrollments },
      eventsQuery,
      workshopQuery,
      { data: eventRegs },
      { data: workshopRegs },
    ] = await Promise.all([
      supabase.from("enrollments").select("course_id").eq("user_id", userId),
      (() => {
        let q = supabase.from("events").select("*").order("start_time", { ascending: true });
        if (startDate) q = q.gte("start_time", startDate);
        if (endDate) q = q.lte("start_time", endDate + "T23:59:59");
        return q;
      })(),
      (() => {
        let q = supabase
          .from("workshop_occurrences" as any)
          .select("*, workshops(title, meeting_type, meeting_link)")
          .order("start_time", { ascending: true });
        if (startDate) q = q.gte("start_time", startDate);
        if (endDate) q = q.lte("start_time", endDate + "T23:59:59");
        return q;
      })(),
      supabase.from("event_registrations").select("event_id").eq("user_id", userId),
      supabase.from("workshop_attendees" as any).select("occurrence_id").eq("user_id", userId),
    ]);

    const registeredEvents = new Set((eventRegs || []).map((r: any) => r.event_id));
    const registeredWorkshops = new Set((workshopRegs || []).map((r: any) => r.occurrence_id));
    const enrolledCourseIds = (enrollments || []).map((e: any) => e.course_id);

    const mappedEvents: EventItem[] = (eventsQuery.data || [])
      .filter((ev: any) => !ev.course_id || enrolledCourseIds.includes(ev.course_id))
      .map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        meeting_link: ev.meeting_link,
        meeting_type: ev.meeting_type || "custom",
        start_time: ev.start_time,
        end_time: ev.end_time,
        recurring: ev.recurring,
        occurrence_number: ev.occurrence_number,
        total_occurrences: ev.total_occurrences,
        source: "event" as const,
        registered: registeredEvents.has(ev.id),
      }));

    const mappedWorkshops: EventItem[] = ((workshopQuery as any).data || []).map((o: any) => ({
      id: o.id,
      title: o.workshops?.title || "Workshop",
      description: null,
      meeting_link: o.meeting_link || o.workshops?.meeting_link || null,
      meeting_type: o.workshops?.meeting_type || "custom",
      start_time: o.start_time,
      end_time: o.end_time,
      recurring: false,
      occurrence_number: o.occurrence_number,
      total_occurrences: o.total_occurrences,
      source: "workshop" as const,
      registered: registeredWorkshops.has(o.id),
    }));

    setEvents(
      [...mappedEvents, ...mappedWorkshops].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      ),
    );
    setLoading(false);
  }, [userId, startDate, endDate]);

  useEffect(() => {
    if (userId) loadEvents();
  }, [userId, loadEvents]);

  const now = new Date();
  const upcoming = events.filter((e) => phaseOf(e, now) !== "completed");
  const completed = events.filter((e) => phaseOf(e, now) === "completed");
  const mine = events.filter((e) => e.registered);

  const toggleRegistration = async (ev: EventItem) => {
    if (!userId) return;
    setBusyId(ev.id);

    // Flip locally first so the button responds immediately; rolled back below
    // if the write fails.
    const previous = ev.registered;
    setEvents((list) =>
      list.map((e) => (e.id === ev.id ? { ...e, registered: !previous } : e)),
    );

    const table = ev.source === "event" ? "event_registrations" : "workshop_attendees";
    const key = ev.source === "event" ? "event_id" : "occurrence_id";

    const { error } = previous
      ? await supabase.from(table as any).delete().eq(key, ev.id).eq("user_id", userId)
      : await supabase.from(table as any).insert({ [key]: ev.id, user_id: userId } as any);

    if (error) {
      setEvents((list) =>
        list.map((e) => (e.id === ev.id ? { ...e, registered: previous } : e)),
      );
      toast({
        title: previous ? "Couldn't cancel" : "Couldn't register",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: previous ? "Registration cancelled" : "You're registered",
        description: previous ? undefined : `We'll show ${ev.title} in My Events.`,
      });

      // Confirming a booking is the one email people look for later, when
      // they want the joining link and cannot find the tab it was on.
      if (!previous) {
        const start = new Date(ev.start_time);
        const minutes = Math.max(
          0,
          Math.round((new Date(ev.end_time).getTime() - start.getTime()) / 60000),
        );

        void notify({
          event: ev.source === "workshop" ? "workshop.scheduled" : "event.registered",
          variables:
            ev.source === "workshop"
              ? {
                  workshop_name: ev.title,
                  event_date: start.toLocaleDateString(undefined, { dateStyle: "full" }),
                  event_time: start.toLocaleTimeString(undefined, { timeStyle: "short" }),
                  duration: `${minutes} minutes`,
                  session_count: String(ev.total_occurrences ?? 1),
                  join_link: ev.meeting_link || appLink("/events"),
                }
              : {
                  event_name: ev.title,
                  event_date: start.toLocaleDateString(undefined, { dateStyle: "full" }),
                  event_time: start.toLocaleTimeString(undefined, { timeStyle: "short" }),
                  duration: `${minutes} minutes`,
                  join_link: ev.meeting_link || appLink("/events"),
                  calendar_link: appLink("/events"),
                },
        });
      }
    }

    setBusyId(null);
  };

  const handleJoin = (ev: EventItem) => {
    const url = safeUrl(ev.meeting_link);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast({ title: "No meeting link", description: "This event has no meeting link set." });
  };

  const copyLink = async (ev: EventItem) => {
    const url = safeUrl(ev.meeting_link);
    if (!url) {
      toast({ title: "No meeting link", variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  /** Downloads a .ics so "Add to calendar" actually does something. */
  const addToCalendar = (ev: EventItem) => {
    const stamp = (iso: string) => format(parseISO(iso), "yyyyMMdd'T'HHmmss");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `UID:${ev.id}`,
      `DTSTART:${stamp(ev.start_time)}`,
      `DTEND:${stamp(ev.end_time)}`,
      `SUMMARY:${ev.title}`,
      ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}` : "",
      ev.meeting_link ? `URL:${ev.meeting_link}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.title.replace(/[^\w-]+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ ev }: { ev: EventItem }) => {
    const phase = phaseOf(ev, now);
    if (phase === "completed") return <Badge variant="secondary" className="text-xs">Completed</Badge>;
    if (phase === "live") {
      return (
        <Badge className="bg-destructive text-destructive-foreground text-xs gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          Live now
        </Badge>
      );
    }
    const mins = differenceInMinutes(parseISO(ev.start_time), now);
    if (mins <= 60) {
      return <Badge className="bg-amber-500 text-white text-xs">Starts in {mins} min</Badge>;
    }
    return <Badge className="bg-success text-success-foreground text-xs">Upcoming</Badge>;
  };

  const EventCard = ({ ev }: { ev: EventItem }) => {
    const phase = phaseOf(ev, now);
    const start = parseISO(ev.start_time);

    return (
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md",
          phase === "live" && "ring-1 ring-destructive/40",
          phase === "completed" && "opacity-75",
        )}
      >
        <CardContent className="p-0">
          <div className="flex">
            {/* Time rail. Cards are already grouped under a day heading, so
                repeating the date here said nothing — within a day what you
                scan for is the start time. */}
            <div
              className={cn(
                "w-20 sm:w-24 shrink-0 flex flex-col items-center justify-center py-4 border-r text-center",
                phase === "completed" ? "bg-muted/40" : "bg-accent/10",
              )}
            >
              <span className="text-lg font-bold leading-none tabular-nums">
                {format(start, "h:mm")}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
                {format(start, "a")}
              </span>
            </div>

            <div className="flex-1 min-w-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{ev.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      ends {format(parseISO(ev.end_time), "h:mm a")}
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      <Video className="h-3.5 w-3.5" />
                      {ev.meeting_type === "custom" ? "Custom meeting" : ev.meeting_type}
                    </span>
                    {ev.total_occurrences && ev.total_occurrences > 1 && (
                      <span>
                        Session {ev.occurrence_number} of {ev.total_occurrences}
                      </span>
                    )}
                  </div>
                  {ev.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{ev.description}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge ev={ev} />
                  {ev.registered && phase !== "completed" && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                      <CalendarCheck className="h-3.5 w-3.5" /> Registered
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {phase !== "completed" && (
                  <>
                    <Button
                      size="sm"
                      variant={ev.registered ? "outline" : "default"}
                      disabled={busyId === ev.id}
                      onClick={() => toggleRegistration(ev)}
                      className="h-8 text-xs"
                    >
                      {ev.registered ? (
                        <>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancel
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" /> Register
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleJoin(ev)}
                      className="h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      Join
                    </Button>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" aria-label="More actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleJoin(ev)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open meeting
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addToCalendar(ev)}>
                      <CalendarPlus className="h-3.5 w-3.5 mr-2" /> Add to calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyLink(ev)}>
                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy meeting link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ title, hint }: { title: string; hint: string }) => (
    <div className="text-center py-16">
      <div className="h-14 w-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-3">
        <Calendar className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );

  const List = ({ list, empty }: { list: EventItem[]; empty: React.ReactNode }) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      );
    }
    if (list.length === 0) return <>{empty}</>;

    // Grouped by day so a long list stays scannable.
    const groups: Record<string, EventItem[]> = {};
    list.forEach((e) => {
      const key = dayLabel(e.start_time);
      (groups[key] ||= []).push(e);
    });

    return (
      <div className="space-y-6">
        {Object.entries(groups).map(([day, items]) => (
          <div key={day} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}</h2>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            {items.map((ev) => (
              <EventCard key={`${ev.source}-${ev.id}`} ev={ev} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const nextUp = upcoming[0];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live sessions and workshops from your community.
          </p>
        </div>

        {/* Next-up banner: the one thing most people open this page for. */}
        {!loading && nextUp && (
          <Card className="border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
            <CardContent className="py-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Next up</p>
                <p className="font-semibold text-sm truncate">{nextUp.title}</p>
                <p className="text-xs text-muted-foreground">
                  {dayLabel(nextUp.start_time)} · {format(parseISO(nextUp.start_time), "h:mm a")}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleJoin(nextUp)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Join
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="mine">My Events ({mine.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="From date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <Input
                type="date"
                aria-label="To date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 h-8 text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={loadEvents}
                aria-label="Refresh events"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <TabsContent value="upcoming" className="mt-5">
            <List
              list={upcoming}
              empty={<EmptyState title="Nothing scheduled" hint="New sessions will show up here." />}
            />
          </TabsContent>

          <TabsContent value="mine" className="mt-5">
            <List
              list={mine}
              empty={
                <EmptyState
                  title="No registrations yet"
                  hint="Hit Register on an event and it will appear here."
                />
              }
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-5">
            <List
              list={completed}
              empty={<EmptyState title="No past events" hint="Sessions you've attended will be listed here." />}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
