import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const formResponses = [
  { name: "Emma Wilson", contact: "emma@mail.com", service: "Growth Masterclass", page: "Landing Page A", date: "Mar 8, 2026" },
  { name: "James Brown", contact: "james@mail.com", service: "Content Strategy", page: "Sales Funnel", date: "Mar 7, 2026" },
  { name: "Sophia Lee", contact: "sophia@mail.com", service: "Email Marketing", page: "Lead Magnet Page", date: "Mar 6, 2026" },
];

const dropOffs = [
  { name: "Michael Chen", contact: "michael@mail.com", service: "Growth Masterclass", page: "Checkout", date: "Mar 8, 2026" },
  { name: "Lisa Park", contact: "lisa@mail.com", service: "Content Strategy", page: "Checkout", date: "Mar 7, 2026" },
];

export default function Leads() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Leads</h1>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>

        <Tabs defaultValue="responses">
          <TabsList className="mb-4">
            <TabsTrigger value="responses">Form Responses</TabsTrigger>
            <TabsTrigger value="dropoffs">Drop-Offs</TabsTrigger>
          </TabsList>

          <TabsContent value="responses">
            <Card className="card-shadow">
              <CardHeader><Input placeholder="Search by name or email..." className="max-w-sm" /></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Page Title</TableHead>
                      <TableHead>Submitted On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formResponses.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{r.name}</TableCell>
                        <TableCell className="text-sm">{r.contact}</TableCell>
                        <TableCell className="text-sm">{r.service}</TableCell>
                        <TableCell className="text-sm">{r.page}</TableCell>
                        <TableCell className="text-sm">{r.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dropoffs">
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dropOffs.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{d.name}</TableCell>
                        <TableCell className="text-sm">{d.contact}</TableCell>
                        <TableCell className="text-sm">{d.service}</TableCell>
                        <TableCell className="text-sm">{d.page}</TableCell>
                        <TableCell className="text-sm">{d.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
