import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Filter } from "lucide-react";
import { useState } from "react";

const mockCoupons = [
  { service: "AI Creator Freedom System™", code: "PAY (-50%)", status: "inactive", duration: "28th Dec, 2025 – 29th Dec, 2025", usage: "N/A" },
  { service: "All services", code: "AI (-₹3999)", status: "inactive", duration: "14th Sep, 2025 – 30th Sep, 2025", usage: "N/A" },
  { service: "Canva AI Course", code: "CANVA100 (-80%)", status: "inactive", duration: "5th Mar, 2025 – 31st Jul, 2025", usage: "N/A" },
  { service: "Canva AI Course", code: "VAS20 (-80%)", status: "inactive", duration: "22nd Jan, 2025 – 31st Jul, 2025", usage: "N/A" },
  { service: "Canva AI Course", code: "BF200 (-₹200)", status: "inactive", duration: "5th Apr, 2025 – 30th Apr, 2025", usage: "N/A" },
  { service: "Canva AI Course", code: "CANVA50 (-50%)", status: "inactive", duration: "18th Nov, 2024 – 20th Nov, 2024", usage: "N/A" },
  { service: "Canva AI Course", code: "CANVAAI100 (-80%)", status: "inactive", duration: "12th Nov, 2024 – 30th Nov, 2024", usage: "N/A" },
];

export default function Coupons() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = mockCoupons
    .filter(c => filter === "all" || c.status === filter)
    .filter(c => c.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Coupons</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" /> Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Coupon Code</Label><Input placeholder="e.g. SUMMER50" /></div>
                <div>
                  <Label>Discount Type</Label>
                  <Select defaultValue="percentage">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Discount Value</Label><Input type="number" placeholder="50" /></div>
                <div>
                  <Label>Applicable Service</Label>
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
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Usage Limit</Label><Input type="number" placeholder="100" /></div>
                  <div><Label>Min Purchase</Label><Input type="number" placeholder="0" /></div>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create Coupon</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="card-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 mb-4">
              <RadioGroup defaultValue="all" onValueChange={setFilter} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="text-sm cursor-pointer">All</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="text-sm cursor-pointer">Active</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="text-sm cursor-pointer">Inactive</Label>
                </div>
              </RadioGroup>
              <Input placeholder="Search by coupon code" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
              <Button variant="outline" size="sm" className="ml-auto"><Filter className="h-4 w-4 mr-1" />Filter by</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Coupon Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{c.service}</TableCell>
                    <TableCell className="font-semibold text-sm">{c.code}</TableCell>
                    <TableCell>
                      <Badge className={c.status === "active" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground text-[10px]"}>
                        {c.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.duration}</TableCell>
                    <TableCell className="text-sm">{c.usage}</TableCell>
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
