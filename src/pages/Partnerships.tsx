import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Handshake, DollarSign, Users, Link, Plus, Copy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockPartners = [
  { name: "John Creator", referrals: 24, sales: "$1,200", commission: "$120", status: "active" },
  { name: "Sarah Influencer", referrals: 18, sales: "$890", commission: "$89", status: "active" },
  { name: "Mike Blogger", referrals: 5, sales: "$250", commission: "$25", status: "pending" },
];

export default function Partnerships() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Partnerships</h1>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" />Create Affiliate Program</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div><div><p className="text-xs text-muted-foreground">Total Partners</p><p className="text-xl font-bold">47</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Total Affiliate Sales</p><p className="text-xl font-bold">$2,340</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><Handshake className="h-5 w-5 text-accent" /></div><div><p className="text-xs text-muted-foreground">Commissions Paid</p><p className="text-xl font-bold">$234</p></div></CardContent></Card>
        </div>

        <Card className="card-shadow mb-6">
          <CardHeader><CardTitle className="text-sm">Your Referral Link</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input value="https://mybrand.com/ref/abc123" readOnly className="font-mono text-sm" />
            <Button variant="outline"><Copy className="h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Partners</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Partner</TableHead><TableHead>Referrals</TableHead><TableHead>Sales</TableHead><TableHead>Commission</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockPartners.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.referrals}</TableCell>
                    <TableCell className="text-sm">{p.sales}</TableCell>
                    <TableCell className="text-sm">{p.commission}</TableCell>
                    <TableCell><Badge className={p.status === "active" ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>{p.status}</Badge></TableCell>
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
