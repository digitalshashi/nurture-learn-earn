import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { SalesNav } from "@/components/sales/SalesNav";
import { useSalesData } from "@/hooks/useSalesData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { availableBalance, computeTotals, formatMoney, type Withdrawal } from "@/lib/sales";
import { useCurrency } from "@/contexts/CurrencyContext";

const statusTone: Record<string, string> = {
  requested: "bg-amber-500 text-white",
  processing: "bg-info text-info-foreground",
  paid: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

const statusIcon: Record<string, typeof Clock> = {
  requested: Clock,
  processing: Loader2,
  paid: CheckCircle2,
  rejected: XCircle,
};

export default function SalesWithdrawals() {
  const { coachId, transactions, withdrawals, loading, reload } = useSalesData();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", method: "bank", destination: "", notes: "" });

  const totals = useMemo(() => computeTotals(transactions), [transactions]);
  const balance = useMemo(
    () => availableBalance(transactions, withdrawals),
    [transactions, withdrawals],
  );
  // The workspace setting decides how money reads, not whatever currency
  // happened to be on the first row.
  const { currency } = useCurrency();

  const pending = withdrawals
    .filter((w) => w.status === "requested" || w.status === "processing")
    .reduce((s, w) => s + Number(w.amount), 0);
  const paidOut = withdrawals
    .filter((w) => w.status === "paid")
    .reduce((s, w) => s + Number(w.amount), 0);

  const request = async () => {
    if (!coachId) return;
    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    // Checked here for a clear message; the ledger is still the authority.
    if (amount > balance) {
      toast({
        title: "More than you have available",
        description: `You can withdraw up to ${formatMoney(balance, currency)}.`,
        variant: "destructive",
      });
      return;
    }
    if (!form.destination.trim()) {
      toast({ title: "Add where the money should go", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("withdrawals").insert({
      coach_id: coachId,
      amount,
      currency,
      method: form.method,
      destination: form.destination.trim(),
      notes: form.notes.trim() || null,
      status: "requested",
    } as never);
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Withdrawal requested", description: "You'll be notified once it's processed." });
    setOpen(false);
    setForm({ amount: "", method: "bank", destination: "", notes: "" });
    reload();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <SalesNav title="Sales" description="Earnings, transactions, subscriptions and payouts." />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Available", value: formatMoney(balance, currency), hint: "Ready to withdraw" },
            { label: "In progress", value: formatMoney(pending, currency), hint: "Requested or processing" },
            { label: "Paid out", value: formatMoney(paidOut, currency), hint: "All time" },
            { label: "Net earnings", value: formatMoney(totals.net, currency), hint: "After refunds" },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold tabular-nums">{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Withdrawal history</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={balance <= 0}
              >
                <Wallet className="h-4 w-4 mr-1" /> Request withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request a withdrawal</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Available right now: <strong>{formatMoney(balance, currency)}</strong>
                </p>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    max={balance}
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Method</Label>
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    {form.method === "upi" ? "UPI ID" : form.method === "paypal" ? "PayPal email" : "Account details"}
                  </Label>
                  <Input
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder={form.method === "upi" ? "name@bank" : "Account number / IFSC"}
                  />
                </div>
                <div>
                  <Label className="text-xs">Note (optional)</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={request}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold">No withdrawals yet</p>
                      <p className="text-xs text-muted-foreground">
                        {balance > 0
                          ? `You have ${formatMoney(balance, currency)} ready to withdraw.`
                          : "Once you've made sales, you can withdraw your earnings here."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w: Withdrawal) => {
                    const Icon = statusIcon[w.status] ?? Clock;
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(w.requested_at).toLocaleDateString(undefined, {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm capitalize">{w.method || "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {w.destination || "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatMoney(Number(w.amount), currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusTone[w.status] ?? ""} gap-1`}>
                            <Icon className="h-3 w-3" /> {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {w.processed_at
                            ? new Date(w.processed_at).toLocaleDateString(undefined, {
                                day: "numeric", month: "short",
                              })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
