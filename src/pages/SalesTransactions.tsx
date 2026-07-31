import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const transactions = [
  { id: "TXN-001", customer: "Alice Johnson", service: "Growth Masterclass", amount: "$49", date: "Mar 8, 2026", status: "completed" },
  { id: "TXN-002", customer: "Bob Smith", service: "Content Strategy", amount: "$99", date: "Mar 7, 2026", status: "completed" },
  { id: "TXN-003", customer: "Carol Lee", service: "Growth Masterclass", amount: "$49", date: "Mar 7, 2026", status: "refunded" },
  { id: "TXN-004", customer: "David Kim", service: "Email Marketing", amount: "$29", date: "Mar 6, 2026", status: "completed" },
];

export default function SalesTransactions() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Transactions</h1>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
        <Card className="card-shadow">
          <CardHeader><Input placeholder="Search transactions..." className="max-w-sm" /></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {transactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium text-sm">{t.customer}</TableCell>
                    <TableCell className="text-sm">{t.service}</TableCell>
                    <TableCell className="text-sm font-medium">{t.amount}</TableCell>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell><Badge className={t.status === "completed" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>{t.status}</Badge></TableCell>
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
