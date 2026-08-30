import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Wallet,
  RotateCcw,
  ShoppingCart,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SalesNav } from "@/components/sales/SalesNav";
import { useSalesData } from "@/hooks/useSalesData";
import {
  availableBalance,
  buildSeries,
  computeTotals,
  formatMoney,
  topProducts,
} from "@/lib/sales";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyIcon } from "@/components/CurrencyIcon";

export default function SalesEarnings() {
  const { transactions, withdrawals, loading, error } = useSalesData();

  const totals = useMemo(() => computeTotals(transactions), [transactions]);
  const series = useMemo(() => buildSeries(transactions, 6), [transactions]);
  const products = useMemo(() => topProducts(transactions), [transactions]);
  const balance = useMemo(
    () => availableBalance(transactions, withdrawals),
    [transactions, withdrawals],
  );

  // The workspace setting decides how money reads, not whatever currency
  // happened to be on the first row.
  const { currency } = useCurrency();

  // Month-over-month movement, the number that actually says how it's going.
  const thisMonth = series[series.length - 1]?.net ?? 0;
  const lastMonth = series[series.length - 2]?.net ?? 0;
  const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  const kpis = [
    {
      label: "Net earnings",
      value: formatMoney(totals.net, currency),
      icon: CurrencyIcon,
      tone: "text-success",
      hint: `${formatMoney(totals.gross, currency)} gross − ${formatMoney(totals.refunded, currency)} refunded`,
    },
    {
      label: "This month",
      value: formatMoney(thisMonth, currency),
      icon: TrendingUp,
      tone: "text-accent",
      hint:
        delta === null
          ? "No comparable month yet"
          : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs last month`,
    },
    {
      label: "Sales",
      value: String(totals.saleCount),
      icon: ShoppingCart,
      tone: "text-info",
      hint: `Average order ${formatMoney(totals.averageOrderValue, currency)}`,
    },
    {
      label: "Available to withdraw",
      value: formatMoney(balance, currency),
      icon: Wallet,
      tone: "text-accent",
      hint: "Net earnings less payouts already requested",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <SalesNav title="Sales" description="Earnings, transactions, subscriptions and payouts." />

        {error && (
          <Card className="mb-4 border-destructive/40">
            <CardContent className="py-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {kpis.map((k) => (
                <Card key={k.label}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <k.icon className={`h-4 w-4 ${k.tone}`} />
                      <span className="text-xs text-muted-foreground">{k.label}</span>
                    </div>
                    <p className="text-xl font-bold tabular-nums">{k.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{k.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Revenue by month</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Sales against refunds over the last six months.
                  </p>
                </CardHeader>
                <CardContent>
                  {totals.saleCount === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center">
                      <CurrencyIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold">No sales yet</p>
                      <p className="text-xs text-muted-foreground">
                        Revenue appears here as soon as your first payment clears.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip
                          formatter={(v: number, name: string) => [formatMoney(v, currency), name]}
                        />
                        <Legend />
                        <Bar dataKey="sales" name="Sales" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="refunds" name="Refunds" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top products</CardTitle>
                  <p className="text-xs text-muted-foreground">By revenue, all time.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {products.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      Nothing sold yet.
                    </p>
                  ) : (
                    products.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground tabular-nums w-4">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {p.count} {p.count === 1 ? "sale" : "sales"}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {formatMoney(p.revenue, currency)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-muted-foreground" /> Refunds
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Refunded</p>
                  <p className="text-lg font-bold tabular-nums">
                    {formatMoney(totals.refunded, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Count</p>
                  <p className="text-lg font-bold tabular-nums">{totals.refundCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Refund rate</p>
                  <p className="text-lg font-bold tabular-nums">{totals.refundRate.toFixed(1)}%</p>
                </div>
                {totals.refundRate > 10 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Above 10% — worth a look
                  </Badge>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
