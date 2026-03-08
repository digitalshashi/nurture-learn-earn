import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, DollarSign, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockEvents = [
  { id: 1, title: "1-on-1 Coaching Call", duration: "30 min", price: "$49", slots: 12, booked: 8 },
  { id: 2, title: "Strategy Session", duration: "60 min", price: "$99", slots: 8, booked: 5 },
];

const mockBookings = [
  { name: "Alice Johnson", contact: "alice@mail.com", event: "1-on-1 Coaching Call", date: "Mar 12, 2026", slot: "10:00 AM", status: "confirmed" },
  { name: "Bob Smith", contact: "bob@mail.com", event: "Strategy Session", date: "Mar 14, 2026", slot: "2:00 PM", status: "confirmed" },
  { name: "Carol Lee", contact: "carol@mail.com", event: "1-on-1 Coaching Call", date: "Mar 15, 2026", slot: "11:00 AM", status: "pending" },
];

export default function Events() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Events & 1-1 Consultations</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Create Event</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Event Title</Label><Input placeholder="e.g. 1-on-1 Coaching Call" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Duration (min)</Label><Input type="number" defaultValue={30} /></div>
                  <div><Label>Price</Label><Input type="number" placeholder="0" /></div>
                </div>
                <div><Label>Available Slots</Label><Input type="number" defaultValue={10} /></div>
                <div><Label>Booking Link</Label><Input placeholder="https://..." /></div>
                <div><Label>Description</Label><Textarea rows={2} /></div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {mockEvents.map((e) => (
            <Card key={e.id} className="card-shadow">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-info/10"><Calendar className="h-5 w-5 text-info" /></div>
                  <h3 className="font-semibold text-sm">{e.title}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.duration}</div>
                  <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{e.price}</div>
                  <div>{e.booked}/{e.slots} booked</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Bookings</CardTitle>
            <Button variant="outline" size="sm">Export CSV</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockBookings.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{b.name}</TableCell>
                    <TableCell className="text-sm">{b.contact}</TableCell>
                    <TableCell className="text-sm">{b.event}</TableCell>
                    <TableCell className="text-sm">{b.date}</TableCell>
                    <TableCell className="text-sm">{b.slot}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"} className={b.status === "confirmed" ? "bg-success text-success-foreground" : ""}>
                        {b.status}
                      </Badge>
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
