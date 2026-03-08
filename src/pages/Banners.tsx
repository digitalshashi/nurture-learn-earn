import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, Filter, Pencil, Trash2, Image } from "lucide-react";
import { useState } from "react";

const mockBanners = [
  { title: "New Year Sale", services: "All Services", status: "active", start: "Jan 1, 2026", end: "Jan 15, 2026" },
  { title: "Course Launch", services: "Growth Masterclass", status: "active", start: "Mar 1, 2026", end: "Mar 31, 2026" },
  { title: "Holiday Special", services: "All Services", status: "expired", start: "Dec 20, 2025", end: "Dec 31, 2025" },
];

export default function Banners() {
  const [search, setSearch] = useState("");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold font-display">Banners</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" /> Create Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Banner</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Banner Title</Label><Input placeholder="e.g. New Year Sale" /></div>
                <div>
                  <Label>Banner Image</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mt-1 cursor-pointer hover:border-accent transition-colors">
                    <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 1200x600 · JPG, PNG</p>
                  </div>
                </div>
                <div><Label>Redirect Link</Label><Input placeholder="https://..." /></div>
                <div>
                  <Label>Select Services</Label>
                  <Select defaultValue="all">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="course1">Growth Masterclass</SelectItem>
                      <SelectItem value="course2">Content Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" /></div>
                  <div><Label>End Date</Label><Input type="date" /></div>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create Banner</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Users will see the latest <strong>'All services'</strong> banner on their feed. Marked as <Badge className="bg-success text-success-foreground text-[10px] mx-1">✓</Badge> in the table below.
        </p>

        <Card className="card-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <Input placeholder="Search by banner title" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <Button variant="outline" size="icon" className="h-9 w-9"><Filter className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-9 w-9"><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {mockBanners.filter(b => b.title.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="text-center py-12">
                <p className="font-semibold text-sm">No banners found!</p>
                <p className="text-xs text-muted-foreground mt-1">It seems you haven't created any banners yet.</p>
                <p className="text-xs text-muted-foreground">To create a new banner, simply click <span className="text-accent font-medium cursor-pointer">Create banner</span></p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banner Title</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBanners.filter(b => b.title.toLowerCase().includes(search.toLowerCase())).map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{b.title}</TableCell>
                      <TableCell className="text-sm">{b.services}</TableCell>
                      <TableCell>
                        <Badge className={b.status === "active" ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{b.start}</TableCell>
                      <TableCell className="text-sm">{b.end}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
