import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES, SUPPORTED_CURRENCIES, formatCurrency, type CurrencyCode } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * The workspace currency, and the only place it is set.
 *
 * Changing it re-renders every price, KPI and chart in the product, so the
 * choice is shown as three explicit cards with a live example rather than a
 * dropdown that hides what it does.
 */
export function CurrencyCard() {
  const { currency, setCurrency } = useCurrency();
  const { toast } = useToast();
  const [saving, setSaving] = useState<CurrencyCode | null>(null);

  const choose = async (next: CurrencyCode) => {
    if (next === currency) return;
    setSaving(next);
    try {
      await setCurrency(next);
      toast({
        title: `Now pricing in ${CURRENCIES[next].label}`,
        description: "Every amount across the platform uses this from now on.",
      });
    } catch (err) {
      toast({
        title: "Couldn't change currency",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" /> Currency
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sets the symbol and number format used everywhere — pricing, sales, invoices and
          reports.
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUPPORTED_CURRENCIES.map((code) => {
            const spec = CURRENCIES[code];
            const active = currency === code;
            const busy = saving === code;

            return (
              <button
                key={code}
                type="button"
                onClick={() => choose(code)}
                disabled={!!saving}
                aria-pressed={active}
                className={cn(
                  "relative rounded-lg border p-4 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border hover:bg-muted/50",
                  saving && !busy && "opacity-60",
                )}
              >
                {active && (
                  <span className="absolute top-2 right-2 text-accent">
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                )}

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold leading-none">{spec.symbol}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{spec.code}</span>
                </div>
                <p className="text-sm font-medium mt-1.5">{spec.label}</p>
                {/* A live example: rupee grouping differs from the others. */}
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {formatCurrency(123456, code)}
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">
          Existing products keep the price you entered — only the symbol and grouping change.
          Each payment gateway can still charge in its own currency if you need that.
        </p>
      </CardContent>
    </Card>
  );
}

export default CurrencyCard;
