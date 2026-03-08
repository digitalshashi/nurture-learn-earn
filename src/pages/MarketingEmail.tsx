import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Mail, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const campaigns = [
  { name: "Course Launch Announcement", recipients: 1240, sent: "Mar 6, 2026", openRate: "42%", status: "sent" },
  { name: "Weekly Newsletter #12", recipients: 890, sent: "Mar 3, 2026", openRate: "38%", status: "sent" },
  { name: "Black Friday Promo", recipients: 0, sent: "-", openRate: "-", status: "draft" },
];

export default function MarketingEmail() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Email Campaigns</h1>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" />New Campaign</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><Send className="h-5 w-5 text-accent" /></div><div><p className="text-xs text-muted-foreground">Campaigns Sent</p><p className="text-xl font-bold">24</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><Mail className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Avg Open Rate</p><p className="text-xl font-bold">40%</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div><div><p className="text-xs text-muted-foreground">Total Recipients</p><p className="text-xl font-bold">3,240</p></div></CardContent></Card>
        </div>

        <Card className="card-shadow">
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Recipients</TableHead><TableHead>Sent</TableHead><TableHead>Open Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {campaigns.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.recipients}</TableCell>
                    <TableCell className="text-sm">{c.sent}</TableCell>
                    <TableCell className="text-sm">{c.openRate}</TableCell>
                    <TableCell><Badge className={c.status === "sent" ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>{c.status}</Badge></TableCell>
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
