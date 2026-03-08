import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, DollarSign, Users, Copy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const referrals = [
  { name: "Jane Doe", date: "Mar 5, 2026", status: "Active", earned: "$15" },
  { name: "Tom Wilson", date: "Feb 20, 2026", status: "Active", earned: "$15" },
  { name: "Amy Chen", date: "Jan 10, 2026", status: "Pending", earned: "$0" },
];

export default function Referral() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Refer & Earn</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><Gift className="h-5 w-5 text-accent" /></div><div><p className="text-xs text-muted-foreground">Total Referrals</p><p className="text-xl font-bold">12</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Total Earned</p><p className="text-xl font-bold">$180</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div><div><p className="text-xs text-muted-foreground">Active Referrals</p><p className="text-xl font-bold">10</p></div></CardContent></Card>
        </div>

        <Card className="card-shadow mb-6">
          <CardHeader><CardTitle className="text-sm">Your Referral Link</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input value="https://platform.com/ref/your-code" readOnly className="font-mono text-sm" />
            <Button variant="outline"><Copy className="h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Referral History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Earned</TableHead></TableRow></TableHeader>
              <TableBody>
                {referrals.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm">{r.status}</TableCell>
                    <TableCell className="text-sm">{r.earned}</TableCell>
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
