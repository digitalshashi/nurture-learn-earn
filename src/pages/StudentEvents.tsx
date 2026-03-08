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
import { Calendar, Clock, ExternalLink, MoreHorizontal, RefreshCw, Copy, CalendarPlus, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, isAfter, parseISO } from "date-fns";

interface OccurrenceWithWorkshop {
  id: string;
  workshop_id: string;
  occurrence_number: number;
  total_occurrences: number | null;
  start_time: string;
  end_time: string;
  status: string;
  meeting_link: string | null;
  workshop_title: string;
  workshop_meeting_type: string;
  workshop_meeting_link: string | null;
}

export default function StudentEvents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<OccurrenceWithWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadEvents = async () => {
    setLoading(true);

    // Load workshop occurrences with workshop info
    let query = supabase
      .from("workshop_occurrences")
      .select("*, workshops(title, meeting_type, meeting_link)")
      .order("start_time", { ascending: true });

    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("start_time", endDate + "T23:59:59");

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error loading events", description: error.message, variant: "destructive" });
    } else {
      const mapped = (data || []).map((o: any) => ({
        id: o.id,
        workshop_id: o.workshop_id,
        occurrence_number: o.occurrence_number,
        total_occurrences: o.total_occurrences,
        start_time: o.start_time,
        end_time: o.end_time,
        status: o.status,
        meeting_link: o.meeting_link,
        workshop_title: o.workshops?.title || "Untitled Workshop",
        workshop_meeting_type: o.workshops?.meeting_type || "custom",
        workshop_meeting_link: o.workshops?.meeting_link || null,
      }));
      setEvents(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadEvents();
  }, [user]);

  const now = new Date();
  const upcoming = events.filter((e) => isAfter(parseISO(e.end_time), now));
  const completed = events.filter((e) => isBefore(parseISO(e.end_time), now));

  const groupByDate = (list: OccurrenceWithWorkshop[]) => {
    const groups: Record<string, OccurrenceWithWorkshop[]> = {};
    list.forEach((e) => {
      const day = format(parseISO(e.start_time), "MMM d, yyyy");
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  };

  const handleJoin = (ev: OccurrenceWithWorkshop) => {
    const link = ev.meeting_link || ev.workshop_meeting_link;
    if (link) window.open(link, "_blank");
    else toast({ title: "No meeting link", description: "This event has no meeting link set." });
  };

  const copyLink = (ev: OccurrenceWithWorkshop) => {
    const link = ev.meeting_link || ev.workshop_meeting_link;
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: "Link copied!" });
    }
  };

  const getStatusBadge = (ev: OccurrenceWithWorkshop) => {
    const start = parseISO(ev.start_time);
    const end = parseISO(ev.end_time);
    if (isBefore(end, now)) return <Badge variant="secondary" className="text-xs">Completed</Badge>;
    if (isAfter(start, now)) return <Badge className="bg-success text-success-foreground text-xs">Upcoming</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground text-xs animate-pulse">Live</Badge>;
  };

  const renderEventList = (list: OccurrenceWithWorkshop[], isCompleted: boolean) => {
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
                <span className="font-semibold text-sm">{ev.workshop_title}</span>
                <span className="text-xs text-muted-foreground">({ev.workshop_meeting_type === "custom" ? "Custom meeting" : ev.workshop_meeting_type})</span>
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
            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 h-8 text-xs"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 h-8 text-xs"
            />
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
