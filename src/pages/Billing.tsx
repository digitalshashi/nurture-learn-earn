import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, CreditCard, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  max_courses: number | null;
  max_students: number | null;
  storage_limit_mb: number | null;
  allowed_modules: string[];
  is_active: boolean;
  sort_order: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
}

/**
 * Plans and invoices from the database.
 *
 * This page previously listed three hardcoded plans priced in dollars and three
 * invented invoices, none of which came from saas_plans or coach_subscriptions.
 */
export default function Billing() {
  const { user } = useAuth();
  const { format, symbol } = useCurrency();
  const coachId = user?.id;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<
    { id: string; occurred_at: string; amount: number; item_name: string | null; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);

    const [planRes, subRes, invRes] = await Promise.all([
      supabase.from("saas_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase
        .from("coach_subscriptions")
        .select("id, plan_id, status, starts_at, expires_at")
        .eq("coach_id", coachId)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Platform charges to the coach, as recorded in the sales ledger.
      supabase
        .from("transactions")
        .select("id, occurred_at, amount, item_name, status")
        .eq("coach_id", coachId)
        .eq("type", "sale")
        .order("occurred_at", { ascending: false })
        .limit(12),
    ]);

    setPlans((planRes.data as unknown as Plan[]) || []);
    setSubscription((subRes.data as unknown as Subscription) ?? null);
    setInvoices((invRes.data as unknown as typeof invoices) || []);
    setLoading(false);
  }, [coachId]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  const currentPlan = useMemo(
    () => plans.find((p) => p.id === subscription?.plan_id) ?? null,
    [plans, subscription],
  );

  const featuresOf = (p: Plan) => {
    const out: string[] = [];
    out.push(p.max_courses === null ? "Unlimited courses" : `${p.max_courses} courses`);
    out.push(p.max_students === null ? "Unlimited students" : `${p.max_students} students`);
    if (p.storage_limit_mb) {
      out.push(
        p.storage_limit_mb >= 1024
          ? `${(p.storage_limit_mb / 1024).toFixed(0)} GB storage`
          : `${p.storage_limit_mb} MB storage`,
      );
    }
    if (p.allowed_modules?.length) out.push(`${p.allowed_modules.length} modules included`);
    return out;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">Billing & plans</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your subscription and payment history. Amounts shown in {symbol}.
            </p>
          </div>

          {/* Yearly pricing is a different number, not a discount badge. */}
          <div className="flex rounded-lg border border-border p-0.5">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                aria-pressed={cycle === c}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors",
                  cycle === c ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {currentPlan && (
              <Card className="mb-6 border-accent/40 bg-accent/5">
                <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                      Current plan
                    </p>
                    <p className="font-bold">{currentPlan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription?.expires_at
                        ? `Renews ${new Date(subscription.expires_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`
                        : "No end date set"}
                    </p>
                  </div>
                  <Badge className="bg-success text-success-foreground capitalize">
                    {subscription?.status ?? "active"}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {plans.length === 0 ? (
              <Card className="mb-8">
                <CardContent className="py-12 text-center">
                  <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">No plans published yet</p>
                  <p className="text-xs text-muted-foreground">
                    Plans configured under Super Admin appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {plans.map((p) => {
                  const isCurrent = p.id === subscription?.plan_id;
                  const price = cycle === "monthly" ? p.monthly_price : p.yearly_price;

                  return (
                    <Card key={p.id} className={cn(isCurrent && "ring-2 ring-accent")}>
                      <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{p.name}</h3>
                          {isCurrent && (
                            <Badge className="bg-accent text-accent-foreground text-[10px]">
                              Current
                            </Badge>
                          )}
                        </div>

                        <p className="text-2xl font-bold tabular-nums">
                          {format(price)}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{cycle === "monthly" ? "mo" : "yr"}
                          </span>
                        </p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                        )}

                        <ul className="space-y-1.5 mt-4">
                          {featuresOf(p).map((f) => (
                            <li key={f} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          className="w-full mt-4"
                          variant={isCurrent ? "outline" : "default"}
                          disabled={isCurrent}
                        >
                          {isCurrent ? "Your plan" : "Contact us to switch"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" /> Payment history
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <p className="text-sm font-semibold">No payments yet</p>
                          <p className="text-xs text-muted-foreground">
                            Charges appear here as they are recorded.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(inv.occurred_at).toLocaleDateString(undefined, {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-sm">{inv.item_name || "—"}</TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">
                            {format(Number(inv.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                inv.status === "completed"
                                  ? "bg-success text-success-foreground"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
