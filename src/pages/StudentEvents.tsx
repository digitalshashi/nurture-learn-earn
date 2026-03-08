import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  meeting_link: string | null;
  start_time: string;
  end_time: string;
  recurring: boolean;
  occurrence_number: number | null;
  total_occurrences: number | null;
  course_id: string | null;
  created_by: string;
  status: string;
  meeting_type: string;
}

export default function StudentEvents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("start_time", endDate + "T23:59:59");

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error loading events", description: error.message, variant: "destructive" });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadEvents();
  }, [user]);

  const now = new Date();
  const upcoming = events.filter((e) => isAfter(parseISO(e.end_time), now));
  const completed = events.filter((e) => isBefore(parseISO(e.end_time), now));

  const groupByDate = (list: EventRow[]) => {
    const groups: Record<string, EventRow[]> = {};
    list.forEach((e) => {
      const day = format(parseISO(e.start_time), "MMM d, yyyy");
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  };

  const handleJoin = (link: string | null) => {
    if (link) window.open(link, "_blank");
    else toast({ title: "No meeting link", description: "This event has no meeting link set." });
  };

  const copyLink = (link: string | null) => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: "Link copied!" });
    }
  };

  const renderEventList = (list: EventRow[], isCompleted: boolean) => {
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground py-8 text-center">No events found.</p>;
    }
    const groups = groupByDate(list);
    return Object.entries(groups).map(([date, items]) => (
      <div key={date}>
        <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold text-destructive">{date}</div>
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
                <span className="text-xs text-muted-foreground">({ev.meeting_type === "custom" ? "Custom meeting" : ev.meeting_type})</span>
              </div>
              {ev.recurring && ev.occurrence_number && ev.total_occurrences && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Occurrence {ev.occurrence_number} of {ev.total_occurrences}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isCompleted ? (
                <Badge variant="secondary" className="text-xs">Completed</Badge>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full bg-muted text-foreground hover:bg-muted-foreground/20 text-xs h-7 px-4"
                  onClick={() => handleJoin(ev.meeting_link)}
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
                  <DropdownMenuItem>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> View event details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CalendarPlus className="h-3.5 w-3.5 mr-2" /> Add to calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyLink(ev.meeting_link)}>
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
            <TabsTrigger value="upcoming" className="data-[state=active]:text-destructive data-[state=active]:border-b-2 data-[state=active]:border-destructive rounded-none">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none">
              Completed
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
