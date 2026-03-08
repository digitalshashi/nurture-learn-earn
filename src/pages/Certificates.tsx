import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockCerts = [
  { name: "Growth Masterclass Certificate", status: "active", sent: 142, created: "Feb 15, 2026" },
  { name: "Content Strategy Completion", status: "active", sent: 89, created: "Jan 20, 2026" },
  { name: "Email Marketing Badge", status: "draft", sent: 0, created: "Mar 1, 2026" },
];

const templatePreviews = [
  { name: "Classic", color: "bg-info/10" },
  { name: "Modern", color: "bg-accent/10" },
  { name: "Elegant", color: "bg-success/10" },
  { name: "Minimal", color: "bg-secondary" },
];

export default function Certificates() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Certificates</h1>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" />Create Certificate</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {templatePreviews.map((t) => (
            <Card key={t.name} className={`card-shadow cursor-pointer hover:card-shadow-hover transition-shadow ${t.color}`}>
              <CardContent className="pt-8 pb-8 flex flex-col items-center gap-2">
                <Award className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-medium">{t.name} Template</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Certificates</CardTitle>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Sent</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCerts.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell>
                      <Badge className={c.status === "active" ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.sent}</TableCell>
                    <TableCell className="text-sm">{c.created}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Edit</Button>
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
