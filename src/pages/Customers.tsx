import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Plus, Download, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockCustomers = [
  { name: "Alice Johnson", contact: "alice@mail.com", service: "Growth Masterclass", cycle: "Monthly", lastTx: "Mar 8, 2026", expiry: "Apr 8, 2026", status: "active" },
  { name: "Bob Smith", contact: "bob@mail.com", service: "Content Strategy", cycle: "One-time", lastTx: "Feb 15, 2026", expiry: "Lifetime", status: "active" },
  { name: "Carol Lee", contact: "carol@mail.com", service: "Email Marketing", cycle: "Monthly", lastTx: "Jan 10, 2026", expiry: "Feb 10, 2026", status: "inactive" },
  { name: "David Kim", contact: "david@mail.com", service: "Growth Masterclass", cycle: "Yearly", lastTx: "Dec 1, 2025", expiry: "Dec 1, 2026", status: "active" },
];

export default function Customers() {
  const active = mockCustomers.filter(c => c.status === "active").length;
  const inactive = mockCustomers.filter(c => c.status === "inactive").length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Customers</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm"><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div>
              <div><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-xl font-bold">{mockCustomers.length}</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><UserCheck className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{active}</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Inactive</p><p className="text-xl font-bold">{inactive}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <Input placeholder="Search customers..." className="max-w-sm" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Last Transaction</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCustomers.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.contact}</TableCell>
                    <TableCell className="text-sm">{c.service}</TableCell>
                    <TableCell className="text-sm">{c.cycle}</TableCell>
                    <TableCell className="text-sm">{c.lastTx}</TableCell>
                    <TableCell className="text-sm">{c.expiry}</TableCell>
                    <TableCell>
                      <Badge className={c.status === "active" ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
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
