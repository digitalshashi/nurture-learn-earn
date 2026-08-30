/**
 * Payments — what has been settled, and what is still owed.
 *
 * "Commission Due" is everything earned minus everything paid, not the sum of
 * the unpaid payout rows. Commission is earned the moment a sale lands, and an
 * affiliate should see it owed to them before anybody has got round to raising
 * a payout for it — otherwise the tab reads as ₹0 due while the Sales tab
 * shows a month of commission.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateTimeCell, EmptyState, StatCard } from "@/components/affiliate/AffiliatePrimitives";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import type { AffiliatePaymentsResponse, PayoutStatus } from "@/lib/affiliate/types";
import { Wallet } from "lucide-react";

/** The three states a payout row can be in, and how each should read. */
const STATUS: Record<PayoutStatus, { label: string; className: string }> = {
  paid: { label: "PAID", className: "bg-success text-success-foreground" },
  pending: { label: "PENDING", className: "bg-amber-500 text-white" },
  not_paid: { label: "NOT PAID YET", className: "bg-destructive text-destructive-foreground" },
};

export function PaymentsTab({ data }: { data: AffiliatePaymentsResponse }) {
  const { format } = useCurrency();

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Commission Paid" value={format(data.totals.paid)} tone="positive" />
        <StatCard label="Commission Due" value={format(data.totals.due)} tone="pending" />
      </div>

      <Card className="card-shadow">
        <CardContent className="pt-4">
          {data.rows.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet">
              {data.totals.due > 0
                ? `You have ${format(data.totals.due)} in commission owed. Payouts appear here once they are raised.`
                : "Once commission has been paid out to you, every payment is listed here with its status."}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Membership Name</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((payout) => {
                    const status = STATUS[payout.status] ?? STATUS.not_paid;
                    return (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <DateTimeCell iso={payout.created_at} />
                        </TableCell>

                        <TableCell>
                          <p className="text-sm font-medium">{payout.membership_name}</p>
                          {payout.sales_amount > 0 && (
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {format(payout.sales_amount)}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {format(payout.commission_amount)}
                        </TableCell>

                        <TableCell>
                          <Badge className={cn("text-[10px]", status.className)}>
                            {status.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {payout.remark || "–"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
