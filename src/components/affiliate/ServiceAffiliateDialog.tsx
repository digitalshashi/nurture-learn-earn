/**
 * The affiliate switch, on the service itself.
 *
 * Before this, a service became promotable only if somebody first created an
 * affiliate programme on a separate screen. Nobody did, so the affiliates
 * dashboard opened empty and read as broken. The switch now lives where the
 * thing being sold already lives: set a rate, press once, and the programme,
 * the product and a shareable link all exist.
 *
 * The link is shown in the same dialog rather than behind a "now go to the
 * dashboard" message, because handing someone a link is the entire point of
 * the press they just made.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/affiliate/CopyButton";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { fetchServiceAffiliate, saveServiceAffiliate } from "@/lib/affiliate/api";
import { absoluteAffiliateUrl, commissionFor } from "@/lib/affiliate/link";
import type { ServiceAffiliateStatus } from "@/lib/affiliate/types";
import { Loader2, Megaphone, TrendingUp } from "lucide-react";

export function ServiceAffiliateDialog({
  service,
  onOpenChange,
  onSaved,
}: {
  /** Null closes the dialog; a service opens it. */
  service: { id: string; title: string; price: number } | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const { format } = useCurrency();

  const [status, setStatus] = useState<ServiceAffiliateStatus | null>(null);
  const [rate, setRate] = useState("10");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    void fetchServiceAffiliate(service.id).then(({ status: next, error: failure }) => {
      if (cancelled) return;
      if (failure) {
        setError(failure);
      } else if (next) {
        setStatus(next);
        setRate(String(next.commission_rate));
        // A service that has never been configured comes back `enabled: false`,
        // which is a description of the past, not a proposal. Loading that into
        // the switch made the dialog contradict itself: the button said "Enable
        // affiliates" and pressing it saved the programme as off. The switch
        // starts where the button promises to take it.
        setEnabled(next.enabled || !next.product_id);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [service]);

  const save = async () => {
    if (!service) return;
    const parsed = Number(rate);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setError("Commission rate must be a number between 0 and 100.");
      return;
    }

    setSaving(true);
    setError(null);
    const { status: next, error: failure } = await saveServiceAffiliate({
      serviceId: service.id,
      commissionRate: parsed,
      active: enabled,
    });
    setSaving(false);

    if (failure || !next) {
      setError(failure ?? "Could not save the affiliate settings.");
      return;
    }

    setStatus(next);
    onSaved?.();
    toast({
      title: enabled ? "Affiliates enabled" : "Affiliates turned off",
      description: enabled
        ? `${service.title} can now be promoted at ${parsed}% commission.`
        : "Existing links stop earning. Commission already earned is unaffected.",
    });
  };

  const link = absoluteAffiliateUrl(
    typeof window === "undefined" ? "" : window.location.origin,
    status?.link?.full_url,
  );
  // What one sale at the current rate actually pays, in money rather than
  // percent. A coach setting this number is deciding what to give away.
  const perSale = commissionFor(service?.price ?? 0, Number(rate) || 0);

  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-accent" />
            Affiliates for {service?.title}
          </DialogTitle>
          <DialogDescription>
            Let members earn a commission for every sale they bring you. Anyone who can see this
            service gets their own link.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Open to affiliates</p>
                <p className="text-xs text-muted-foreground">
                  Turning this off stops new commission. Links already shared keep working.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div>
              <Label htmlFor="af-rate" className="text-xs">
                Commission rate (% of actual earning)
              </Label>
              <div className="mt-1 flex items-center gap-3">
                <Input
                  id="af-rate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-28"
                />
                {(service?.price ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {perSale > 0 ? (
                      <>
                        You pay <span className="font-semibold text-foreground">{format(perSale)}</span>{" "}
                        per sale of {format(service?.price ?? 0)}
                      </>
                    ) : (
                      // A programme at 0% is a link that pays nobody, which is
                      // worth saying out loud before it is saved.
                      "At 0% nobody earns anything for promoting this."
                    )}
                  </p>
                )}
              </div>
            </div>

            {status?.enabled && status.product_id && (
              <>
                <div>
                  <Label className="text-xs">Your own affiliate link</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={link}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-9 flex-1 bg-background font-mono text-xs"
                      aria-label={`Affiliate link for ${service?.title}`}
                    />
                    <CopyButton value={link} label={`Copy your affiliate link for ${service?.title}`} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Every member gets their own version of this from the affiliates dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-3 rounded-lg bg-secondary/40 p-3">
                  {[
                    { label: "Affiliates", value: (status.affiliates ?? 0).toLocaleString() },
                    { label: "Clicks", value: (status.clicks ?? 0).toLocaleString() },
                    { label: "Sales", value: (status.sales_count ?? 0).toLocaleString() },
                    { label: "Commission", value: format(status.commission_total ?? 0) },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                      <p className="text-sm font-bold tabular-nums">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!status?.enabled && (
              <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-xs text-muted-foreground">
                <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Saving this creates the affiliate programme and gives every member a link for this
                service straight away.
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>
            )}

            <Button className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {status?.enabled ? "Save changes" : "Enable affiliates"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
