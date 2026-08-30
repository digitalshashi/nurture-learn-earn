/**
 * Memberships — one card per product an affiliate can sell.
 *
 * The card answers the two questions an affiliate has, in the order they have
 * them: what do I get paid, and what do I share? Everything else — the four
 * metrics along the bottom — is the answer to "is it working", which only
 * matters once the link has been out for a while, so it sits below the fold of
 * the card rather than above the link.
 *
 * The link is rendered read-only rather than as a disabled field: an affiliate
 * needs to be able to select it by hand when the clipboard is unavailable.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/affiliate/CopyButton";
import { EmptyState } from "@/components/affiliate/AffiliatePrimitives";
import { useCurrency } from "@/contexts/CurrencyContext";
import { absoluteAffiliateUrl } from "@/lib/affiliate/link";
import type { AffiliateProduct } from "@/lib/affiliate/types";
import { Package } from "lucide-react";

export function MembershipsTab({
  products,
  origin,
}: {
  products: AffiliateProduct[];
  origin: string;
}) {
  const { format } = useCurrency();

  if (products.length === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-0">
          <EmptyState icon={Package} title="No memberships to promote yet">
            When a coach opens one of their courses or memberships to affiliates, it appears here
            with your own link already generated.
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => {
        const link = absoluteAffiliateUrl(origin, product.full_url);

        const metrics = [
          { label: "Link Clicks", value: product.clicks.toLocaleString() },
          { label: "No. of Sales", value: product.sales_count.toLocaleString() },
          { label: "Total Amount of Sales", value: format(product.sales_amount) },
          { label: "Commission Amount", value: format(product.commission_amount) },
        ];

        return (
          <Card key={product.id} className="card-shadow">
            <CardContent className="pt-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <h3 className="text-base font-bold">{product.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Commission Rate:{" "}
                    <span className="font-semibold text-foreground">
                      {product.commission_rate}%
                    </span>{" "}
                    of Actual Earning
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs text-muted-foreground">Affiliate Link:</p>
                  {link ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={link}
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                        aria-label={`Affiliate link for ${product.name}`}
                        className="h-9 flex-1 truncate bg-background font-mono text-xs"
                      />
                      <CopyButton value={link} label={`Copy the link for ${product.name}`} />
                    </div>
                  ) : (
                    // Better than an empty box with a Copy button beside it.
                    <p className="rounded-lg border border-dashed border-border p-2.5 text-xs text-muted-foreground">
                      Your link is still being generated. Refresh in a moment.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.label}>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-lg font-bold tabular-nums">{metric.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
