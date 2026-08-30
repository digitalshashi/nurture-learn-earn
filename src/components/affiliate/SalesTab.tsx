/**
 * Sales — every purchase made through this affiliate's links.
 *
 * Filtering and pagination both happen in the database rather than in the
 * browser. That is not premature: an affiliate who does well accumulates
 * thousands of these rows, and the alternative is shipping the whole ledger to
 * the client on every visit and then hiding most of it.
 *
 * It follows that the three summary figures cannot be computed from the rows
 * on screen — they come back from the same call, computed over the whole
 * filtered set. A "Total Amount of Sales" that changed when you pressed Next
 * would not be a total.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { CopyButton } from "@/components/affiliate/CopyButton";
import { EmptyState, StatCard } from "@/components/affiliate/AffiliatePrimitives";
import { useCurrency } from "@/contexts/CurrencyContext";
import { fetchAffiliateSales } from "@/lib/affiliate/api";
import type { AffiliateProduct, AffiliateSalesResponse } from "@/lib/affiliate/types";
import { ChevronLeft, ChevronRight, Loader2, Receipt } from "lucide-react";

const PAGE_SIZE = 25;
const ALL = "all";

const EMPTY: AffiliateSalesResponse = {
  rows: [],
  totals: { count: 0, amount: 0, commission: 0 },
  limit: PAGE_SIZE,
  offset: 0,
};

export function SalesTab({ products }: { products: AffiliateProduct[] }) {
  const { format } = useCurrency();

  const [search, setSearch] = useState("");
  const [membership, setMembership] = useState<string>(ALL);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<AffiliateSalesResponse>(EMPTY);
  const [loading, setLoading] = useState(true);

  // Typing is a filter change per keystroke; a short pause makes it one query.
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Any filter change starts again from the first page. Staying on page 4 of a
  // result set that now has one page shows an empty table over a full total.
  useEffect(() => {
    setPage(0);
  }, [debounced, membership, start, end]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchAffiliateSales({
      search: debounced,
      productId: membership === ALL ? null : membership,
      start: start || null,
      end: end || null,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then((next) => {
      if (cancelled) return;
      setData(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debounced, membership, start, end, page]);

  const filtered = debounced !== "" || membership !== ALL || start !== "" || end !== "";
  const total = data.totals.count;
  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0);
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total);

  const summary = useMemo(
    () => [
      { label: "Total no. of Sales", value: total.toLocaleString() },
      { label: "Total Amount of Sales", value: format(data.totals.amount) },
      { label: "Total Commission Earned", value: format(data.totals.commission) },
    ],
    [total, data.totals.amount, data.totals.commission, format],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, phone or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search sales by buyer name, phone or email"
          className="max-w-xs"
        />

        <Select value={membership} onValueChange={setMembership}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by membership">
            <SelectValue placeholder="All memberships" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All memberships</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Input
            type="date"
            value={start}
            // A range that ends before it starts returns nothing and looks
            // broken; the inputs constrain each other instead.
            max={end || undefined}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Sales from date"
            className="h-9 w-[140px] text-sm"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="Sales to date"
            className="h-9 w-[140px] text-sm"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          {loading && data.rows.length === 0 ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data.rows.length === 0 ? (
            filtered ? (
              <EmptyState icon={Receipt} title="No sales match these filters">
                Try widening the date range, or clearing the search.
              </EmptyState>
            ) : (
              <EmptyState icon={Receipt} title="No sales yet">
                Share a link from the Memberships tab. Every purchase made through it appears here
                with the commission it earned.
              </EmptyState>
            )
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Coupon</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Commission Earned</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-sm font-medium">
                          {sale.buyer_name || "—"}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            {sale.buyer_phone && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-info">{sale.buyer_phone}</span>
                                <CopyButton
                                  value={sale.buyer_phone}
                                  label={`Copy phone number for ${sale.buyer_name || "this buyer"}`}
                                />
                              </div>
                            )}
                            {sale.buyer_email && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-info">{sale.buyer_email}</span>
                                <CopyButton
                                  value={sale.buyer_email}
                                  label={`Copy email address for ${sale.buyer_name || "this buyer"}`}
                                />
                              </div>
                            )}
                            {!sale.buyer_phone && !sale.buyer_email && (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm">{sale.membership_name}</TableCell>

                        <TableCell>
                          {sale.coupon_code ? (
                            <Badge className="bg-info text-[10px] text-info-foreground">
                              {sale.coupon_code}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {format(sale.amount_paid)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {format(sale.commission_earned)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(sale.purchased_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {total > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of{" "}
                    {total.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(p - 1, 0))}
                      disabled={page === 0 || loading}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
                      disabled={page >= lastPage || loading}
                    >
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
