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
import { Calendar, Clock, ExternalLink, MoreHorizontal, RefreshCw, Copy, CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, isAfter, parseISO } from "date-fns";

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
}

export default function StudentEvents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadEvents = async () => {
    if (!user) return;
    setLoading(true);

    // Load coach-created events (from events table)
    // Students see: events with no course_id (global) OR events linked to courses they're enrolled in
    const [{ data: enrollments }, eventsQuery, workshopQuery] = await Promise.all([
      supabase.from("enrollments").select("course_id").eq("user_id", user.id),
      (() => {
        let q = supabase
          .from("events")
          .select("*")
          .order("start_time", { ascending: true });
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
    ]);

    const enrolledCourseIds = (enrollments || []).map((e: any) => e.course_id);

    // Filter events: global (no course_id) or enrolled course events
    const allEvents = (eventsQuery.data || []).filter((ev: any) =>
      !ev.course_id || enrolledCourseIds.includes(ev.course_id)
    );

    const mappedEvents: EventItem[] = allEvents.map((ev: any) => ({
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
    }));

    // Map workshop occurrences
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
    }));

    // Merge and sort
    const combined = [...mappedEvents, ...mappedWorkshops].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    setEvents(combined);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadEvents();
  }, [user]);

  const now = new Date();
  const upcoming = events.filter((e) => isAfter(parseISO(e.end_time), now));
  const completed = events.filter((e) => isBefore(parseISO(e.end_time), now));

  const groupByDate = (list: EventItem[]) => {
    const groups: Record<string, EventItem[]> = {};
    list.forEach((e) => {
      const day = format(parseISO(e.start_time), "MMM d, yyyy");
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  };

  const handleJoin = (ev: EventItem) => {
    if (ev.meeting_link) window.open(ev.meeting_link, "_blank");
    else toast({ title: "No meeting link", description: "This event has no meeting link set." });
  };

  const copyLink = (ev: EventItem) => {
    if (ev.meeting_link) {
      navigator.clipboard.writeText(ev.meeting_link);
      toast({ title: "Link copied!" });
    }
  };

  const getStatusBadge = (ev: EventItem) => {
    const start = parseISO(ev.start_time);
    const end = parseISO(ev.end_time);
    if (isBefore(end, now)) return <Badge variant="secondary" className="text-xs">Completed</Badge>;
    if (isAfter(start, now)) return <Badge className="bg-success text-success-foreground text-xs">Upcoming</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground text-xs animate-pulse">Live</Badge>;
  };

  const renderEventList = (list: EventItem[], isCompleted: boolean) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No events found.</p>
        </div>
      );
    }
    const groups = groupByDate(list);
    return Object.entries(groups).map(([date, items]) => (
      <div key={date}>
        <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold text-accent">{date}</div>
        {items.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between px-4 py-3 border-b border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>
                  {format(parseISO(ev.start_time), "h:mm a")} – {format(parseISO(ev.end_time), "h:mm a")}
                </span>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-semibold text-sm">{ev.title}</span>
                <span className="text-xs text-muted-foreground">
                  ({ev.meeting_type === "custom" ? "Custom meeting" : ev.meeting_type})
                </span>
              </div>
              {ev.total_occurrences && ev.total_occurrences > 1 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Occurrence {ev.occurrence_number} of {ev.total_occurrences}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getStatusBadge(ev)}
              {!isCompleted && (
                <Button
                  size="sm"
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-7 px-4"
                  onClick={() => handleJoin(ev)}
                >
                  Join
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleJoin(ev)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CalendarPlus className="h-3.5 w-3.5 mr-2" /> Add to calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyLink(ev)}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> Copy event link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    ));
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-4">Events</h1>

        <Tabs defaultValue="upcoming">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming" className="data-[state=active]:text-accent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none">
              Completed ({completed.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 mb-4">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-8 text-xs" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-8 text-xs" />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={loadEvents}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <TabsContent value="upcoming" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
                </div>
              ) : (
                renderEventList(upcoming, false)
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-0">
              {renderEventList(completed, true)}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
