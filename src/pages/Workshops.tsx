import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Clock, Users, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const mockWorkshops = [
  { id: 1, title: "Instagram Growth Masterclass", date: "Mar 15, 2026", time: "10:00 AM", duration: "90 min", attendees: 45, status: "upcoming", recurring: true },
  { id: 2, title: "Content Strategy Deep Dive", date: "Mar 20, 2026", time: "2:00 PM", duration: "60 min", attendees: 32, status: "upcoming", recurring: false },
  { id: 3, title: "Email Marketing Basics", date: "Mar 5, 2026", time: "11:00 AM", duration: "45 min", attendees: 78, status: "completed", recurring: false },
];

export default function Workshops() {
  const [search, setSearch] = useState("");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Workshops</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Create Workshop
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Workshop</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Workshop Title</Label><Input placeholder="e.g. Growth Hacking Masterclass" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" /></div>
                  <div><Label>Start Time</Label><Input type="time" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Duration (min)</Label><Input type="number" defaultValue={60} /></div>
                  <div>
                    <Label>Timezone</Label>
                    <Select defaultValue="ist">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ist">IST</SelectItem>
                        <SelectItem value="est">EST</SelectItem>
                        <SelectItem value="pst">PST</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Zoom Meeting Link</Label><Input placeholder="https://zoom.us/j/..." /></div>
                <div><Label>Description</Label><Textarea placeholder="Workshop description..." rows={3} /></div>
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between"><Label>Recurring Workshop</Label><Switch /></div>
                  <div className="flex items-center justify-between"><Label>Enable Waiting Room</Label><Switch /></div>
                  <div className="flex items-center justify-between"><Label>Auto Recording</Label><Switch defaultChecked /></div>
                  <div className="flex items-center justify-between"><Label>Auto-upload to Course</Label><Switch /></div>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create Workshop</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Input placeholder="Search workshops..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockWorkshops.filter(w => w.title.toLowerCase().includes(search.toLowerCase())).map((w) => (
            <Card key={w.id} className="card-shadow hover:card-shadow-hover transition-shadow cursor-pointer">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-accent/10"><Video className="h-5 w-5 text-accent" /></div>
                  <Badge variant={w.status === "upcoming" ? "default" : "secondary"} className={w.status === "upcoming" ? "bg-success text-success-foreground" : ""}>
                    {w.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-2">{w.title}</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{w.date} at {w.time}</div>
                  <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{w.duration}</div>
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{w.attendees} attendees</div>
                </div>
                {w.recurring && <Badge variant="outline" className="mt-2 text-[10px]">Recurring</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
