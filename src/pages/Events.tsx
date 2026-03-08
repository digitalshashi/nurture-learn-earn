import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  status: string;
  meeting_type: string;
}

interface CourseOption {
  id: string;
  title: string;
}

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    meeting_link: "",
    meeting_type: "custom",
    start_time: "",
    end_time: "",
    course_id: "",
    recurring: false,
    total_occurrences: 1,
  });

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

  const handleCreate = async () => {
    if (!user || !form.title || !form.start_time || !form.end_time) return;
    const { error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description || null,
      meeting_link: form.meeting_link || null,
      meeting_type: form.meeting_type,
      start_time: form.start_time,
      end_time: form.end_time,
      course_id: form.course_id || null,
      recurring: form.recurring,
      total_occurrences: form.total_occurrences,
      occurrence_number: 1,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event created" });
      setOpen(false);
      setForm({ title: "", description: "", meeting_link: "", meeting_type: "custom", start_time: "", end_time: "", course_id: "", recurring: false, total_occurrences: 1 });
      loadData();
    }
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
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
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
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate}>Create Event</Button>
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
              <div className="p-2 rounded-lg bg-warning/10"><DollarSign className="h-5 w-5 text-warning" /></div>
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
                  <TableHead>Recurring</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No events yet. Create your first event.</TableCell></TableRow>
                ) : events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium text-sm">{ev.title}</TableCell>
                    <TableCell className="text-sm capitalize">{ev.meeting_type.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">{format(new Date(ev.start_time), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="text-sm">{format(new Date(ev.end_time), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell><Badge variant={ev.recurring ? "default" : "secondary"}>{ev.recurring ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{ev.status}</Badge></TableCell>
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
