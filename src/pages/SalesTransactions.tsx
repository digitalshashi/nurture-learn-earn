import { useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Upload, Loader2, ArrowLeftRight, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SalesNav } from "@/components/sales/SalesNav";
import { useSalesData } from "@/hooks/useSalesData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { computeTotals, formatMoney, parseCsv, toCsv, type Transaction } from "@/lib/sales";
import { useCurrency } from "@/contexts/CurrencyContext";

const PAGE_SIZE = 25;

const statusTone: Record<string, string> = {
  completed: "bg-success text-success-foreground",
  pending: "bg-amber-500 text-white",
  failed: "bg-destructive text-destructive-foreground",
  refunded: "bg-muted text-muted-foreground",
};

export default function SalesTransactions() {
  const { coachId, transactions, loading, reload } = useSalesData();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);

  const [manual, setManual] = useState({
    amount: "",
    item_name: "",
    customer_name: "",
    customer_email: "",
    type: "sale",
  });
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (status !== "all" && t.status !== status) return false;
      if (from && new Date(t.occurred_at) < new Date(from)) return false;
      // Include the whole end day rather than cutting it off at midnight.
      if (to && new Date(t.occurred_at) > new Date(to + "T23:59:59")) return false;
      if (!q) return true;
      return [t.customer_name, t.customer_email, t.item_name, t.gateway_txn_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [transactions, search, type, status, from, to]);

  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // The workspace setting decides how money reads, not whatever currency
  // happened to be on the first row.
  const { currency } = useCurrency();

  /** Exports exactly what is on screen, not the whole ledger. */
  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: "Nothing to export", description: "No rows match these filters." });
      return;
    }
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${filtered.length} rows` });
  };

  const importCsv = async (file: File) => {
    if (!coachId) return;
    setImporting(true);

    const { rows, errors } = parseCsv(await file.text());

    // Bad rows are reported rather than guessed at: a wrong amount silently
    // corrupts every total on these pages.
    if (errors.length > 0) {
      toast({
        title: `${errors.length} row${errors.length === 1 ? "" : "s"} skipped`,
        description: errors.slice(0, 3).join(" · "),
        variant: "destructive",
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from("transactions")
        .insert(rows.map((r) => ({ ...r, coach_id: coachId })) as never);

      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `Imported ${rows.length} transactions` });
        reload();
      }
    }

    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addManual = async () => {
    if (!coachId) return;
    const amount = Number(manual.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      coach_id: coachId,
      type: manual.type,
      status: "completed",
      amount,
      currency,
      item_name: manual.item_name || null,
      customer_name: manual.customer_name || null,
      customer_email: manual.customer_email || null,
      gateway: "manual",
    } as never);
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transaction recorded" });
    setManualOpen(false);
    setManual({ amount: "", item_name: "", customer_name: "", customer_email: "", type: "sale" });
    reload();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <SalesNav title="Sales" description="Earnings, transactions, subscriptions and payouts." />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Search customer, product or reference…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="max-w-xs"
            aria-label="Search transactions"
          />
          <Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
            <SelectTrigger className="w-32" aria-label="Type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="sale">Sales</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-36" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" aria-label="To date" />

          <div className="ml-auto flex gap-2">
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Record</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record a transaction</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    For payments taken outside the platform, or to log a refund you issued manually.
                  </p>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={manual.type} onValueChange={(v) => setManual({ ...manual, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Sale</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Amount</Label><Input type="number" min="0" step="0.01" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} /></div>
                  <div><Label className="text-xs">Product</Label><Input value={manual.item_name} onChange={(e) => setManual({ ...manual, item_name: e.target.value })} /></div>
                  <div><Label className="text-xs">Customer name</Label><Input value={manual.customer_name} onChange={(e) => setManual({ ...manual, customer_name: e.target.value })} /></div>
                  <div><Label className="text-xs">Customer email</Label><Input type="email" value={manual.customer_email} onChange={(e) => setManual({ ...manual, customer_email: e.target.value })} /></div>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={addManual} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          <span className="text-muted-foreground">
            {filtered.length} of {transactions.length} rows
          </span>
          <span>Gross <strong className="tabular-nums">{formatMoney(totals.gross, currency)}</strong></span>
          <span>Refunded <strong className="tabular-nums">{formatMoney(totals.refunded, currency)}</strong></span>
          <span>Net <strong className="tabular-nums">{formatMoney(totals.net, currency)}</strong></span>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <ArrowLeftRight className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold">
                        {transactions.length === 0 ? "No transactions yet" : "Nothing matches these filters"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transactions.length === 0
                          ? "Sales appear here automatically once a payment clears."
                          : "Try widening the date range or clearing the search."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((t: Transaction) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(t.occurred_at).toLocaleDateString(undefined, {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium">{t.customer_name || "—"}</p>
                        {t.customer_email && (
                          <p className="text-xs text-muted-foreground">{t.customer_email}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{t.item_name || "—"}</TableCell>
                      <TableCell className="text-xs capitalize text-muted-foreground">
                        {t.gateway || "—"}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-semibold tabular-nums ${t.type === "refund" ? "text-destructive" : ""}`}>
                        {t.type === "refund" ? "−" : ""}{formatMoney(Number(t.amount), currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusTone[t.status] ?? ""}>{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {pageCount > 1 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {pageCount}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
