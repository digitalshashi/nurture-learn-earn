import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Copy } from "lucide-react";
import { useState } from "react";

const mockUnsubscribed = [
  { name: "Swathi", country: "INDIA", phone: "+91-7799522455", email: "swathimallavarapu09@gmail.com", date: "January 28, 2026 8:39 PM" },
  { name: "Shaik Jaffar Sadik", country: "INDIA", phone: "+91-8886979099", email: "jaffarhot0001@gmail.com", date: "January 1, 2026 2:33 PM" },
  { name: "Ramani", country: "INDIA", phone: "+91-7416317653", email: "rsreedharala@gmail.com", date: "December 31, 2025 10:44 AM" },
];

export default function UnsubscribedUsers() {
  const [search, setSearch] = useState("");

  const filtered = mockUnsubscribed.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-1">Unsubscribed Users</h1>
        <p className="text-sm text-muted-foreground mb-6">List of all customers who unsubscribed to your email broadcasts</p>

        <Card className="card-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <Input placeholder="Search by name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
              <Button variant="outline" size="sm" className="ml-auto">
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Unsubscribed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">🇮🇳 {u.country}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-info hover:underline cursor-pointer">{u.phone}</span>
                          <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-info hover:underline cursor-pointer">{u.email}</span>
                          <Copy className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled>‹</Button>
              <Button variant="outline" size="sm" className="bg-accent/10 text-accent border-accent">1</Button>
              <Button variant="outline" size="sm" disabled>›</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
