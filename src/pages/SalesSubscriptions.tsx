import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SalesNav } from "@/components/sales/SalesNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/sales";
import { useCurrency } from "@/contexts/CurrencyContext";

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  purchased_at: string;
  expires_at: string | null;
  amount_paid: number | null;
  service: { title: string; currency: string; subscription_interval: string | null } | null;
  customer: { full_name: string | null; email: string | null } | null;
}

/**
 * Recurring access, drawn from service_users rows that have an end date.
 *
 * This route previously rendered the Earnings page, so subscriptions had no
 * screen at all.
 */
export default function SalesSubscriptions() {
  const { user } = useAuth();
  const coachId = user?.id;

  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);

    // Only this coach's services, and only access that actually renews.
    const { data } = await supabase
      .from("service_users")
      .select(
        "id, user_id, status, purchased_at, expires_at, amount_paid, services!inner(title, currency, subscription_interval, coach_id), profiles(full_name, email)",
      )
      .eq("services.coach_id", coachId)
      .not("expires_at", "is", null)
      .order("expires_at", { ascending: true });

    setRows(
      ((data || []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        user_id: String(r.user_id),
        status: String(r.status),
        purchased_at: String(r.purchased_at),
        expires_at: (r.expires_at as string) ?? null,
        amount_paid: (r.amount_paid as number) ?? null,
        service: (r.services as SubscriptionRow["service"]) ?? null,
        customer: (r.profiles as SubscriptionRow["customer"]) ?? null,
      })),
    );
    setLoading(false);
  }, [coachId]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  const now = Date.now();
  const DAY = 86_400_000;

  /** Expired rows are still listed, but reported honestly as lapsed. */
  const stateOf = (r: SubscriptionRow) => {
    if (!r.expires_at) return "active";
    const ends = new Date(r.expires_at).getTime();
    if (ends < now) return "expired";
    if (ends - now <= 7 * DAY) return "expiring";
    return "active";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.customer?.full_name, r.customer?.email, r.service?.title]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let mrr = 0;

    for (const r of rows) {
      const state = stateOf(r);
      if (state === "expired") expired++;
      else {
        if (state === "expiring") expiring++;
        else active++;

        // Normalise to a monthly figure so MRR means one thing.
        const amount = Number(r.amount_paid) || 0;
        const interval = r.service?.subscription_interval;
        if (interval === "yearly") mrr += amount / 12;
        else if (interval === "quarterly") mrr += amount / 3;
        else if (interval === "weekly") mrr += amount * 4.33;
        else mrr += amount;
      }
    }
    return { active, expiring, expired, mrr };
  }, [rows, now]);

  // The workspace setting decides how money reads, not whatever currency
  // happened to be on the first row.
  const { currency } = useCurrency();

  const tone: Record<string, string> = {
    active: "bg-success text-success-foreground",
    expiring: "bg-amber-500 text-white",
    expired: "bg-muted text-muted-foreground",
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <SalesNav title="Sales" description="Earnings, transactions, subscriptions and payouts." />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Active", value: String(counts.active), hint: "Renewing normally" },
            { label: "Expiring soon", value: String(counts.expiring), hint: "Within 7 days" },
            { label: "Lapsed", value: String(counts.expired), hint: "Past their end date" },
            {
              label: "Monthly recurring",
              value: formatMoney(counts.mrr, currency),
              hint: "Normalised to a month",
            },
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

        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="Search customer or plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            aria-label="Search subscriptions"
          />
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Renews / ends</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold">
                        {rows.length === 0 ? "No subscriptions yet" : "Nothing matches that search"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rows.length === 0
                          ? "Services sold with an end date show up here."
                          : "Try a different name or plan."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const state = stateOf(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          <p className="font-medium">{r.customer?.full_name || "—"}</p>
                          {r.customer?.email && (
                            <p className="text-xs text-muted-foreground">{r.customer.email}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.service?.title || "—"}
                          {r.service?.subscription_interval && (
                            <span className="text-xs text-muted-foreground">
                              {" "}· {r.service.subscription_interval}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(r.purchased_at).toLocaleDateString(undefined, {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {r.expires_at
                            ? new Date(r.expires_at).toLocaleDateString(undefined, {
                                day: "numeric", month: "short", year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatMoney(Number(r.amount_paid) || 0, currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={tone[state]}>{state}</Badge>
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
