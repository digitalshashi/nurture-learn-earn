import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Loader2, CheckCircle2, ExternalLink, Star, Copy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  PAYMENT_PROVIDERS,
  PROVIDER_IDS,
  hasWebhookSigning,
  isGatewayReady,
  type GatewayRow,
  type PaymentProvider,
} from "@/lib/paymentProviders";

/**
 * Where the gateways send payment notifications. One URL for both providers;
 * the function tells them apart by how they sign the request.
 */
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`;

/**
 * Connect and manage every payment gateway for one coach.
 *
 * Used both by a coach on their own settings page and by an admin acting on a
 * coach's behalf, so the target coach is passed in rather than read from the
 * session.
 */
export function PaymentGatewaysCard({ coachId }: { coachId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, GatewayRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PaymentProvider | null>(null);
  // Secrets are write-only, so typed values live here and are cleared on save.
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coach_payment_gateways")
      .select(
        "id, coach_id, provider, key_id, environment, currency, is_enabled, is_default, has_secret, has_salt, has_webhook_secret",
      )
      .eq("coach_id", coachId);

    if (error) {
      toast({ title: "Couldn't load gateways", description: error.message, variant: "destructive" });
    }

    const next: Record<string, GatewayRow> = {};
    for (const row of (data || []) as unknown as GatewayRow[]) next[row.provider] = row;
    setRows(next);
    setLoading(false);
  }, [coachId, toast]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  const draftFor = (p: PaymentProvider, column: string) => drafts[p]?.[column] ?? "";

  const setDraft = (p: PaymentProvider, column: string, value: string) =>
    setDrafts((d) => ({ ...d, [p]: { ...(d[p] || {}), [column]: value } }));

  const save = async (provider: PaymentProvider) => {
    const spec = PAYMENT_PROVIDERS[provider];
    const existing = rows[provider];
    const draft = drafts[provider] || {};

    // A required secret may be left blank when one is already stored: that
    // means "keep what is saved", not "clear it".
    for (const field of spec.fields) {
      if (!field.required) continue;
      const provided = draft[field.column]?.trim();
      const alreadyStored =
        field.column === "key_secret" ? existing?.has_secret : !!existing?.key_id;
      if (!provided && !alreadyStored) {
        toast({ title: `${field.label} is required`, variant: "destructive" });
        return;
      }
    }

    setSaving(provider);

    const payload: TablesInsert<"coach_payment_gateways"> = {
      coach_id: coachId,
      provider,
      environment: existing?.environment ?? "live",
      currency: existing?.currency ?? spec.currencies[0],
      is_enabled: existing?.is_enabled ?? true,
      is_default: existing?.is_default ?? Object.keys(rows).length === 0,
      updated_at: new Date().toISOString(),
    };
    // Only send what was actually typed, so a blank field never wipes a secret.
    for (const field of spec.fields) {
      const value = draft[field.column]?.trim();
      if (value) payload[field.column] = value;
    }

    // Deliberately an insert-or-update rather than an upsert.
    //
    // Every secret here is write-only: the browser may set key_secret, salt and
    // webhook_secret but has no SELECT privilege on them. An upsert compiles to
    // ON CONFLICT DO UPDATE SET secret = excluded.secret, and Postgres requires
    // SELECT on any column read that way — so saving a secret failed with
    // "permission denied for table coach_payment_gateways" while saving a
    // non-secret change worked. A plain INSERT or UPDATE reads nothing, so it
    // needs no SELECT and the columns stay unreadable. RLS still applies to
    // both. Do not "simplify" this back into an upsert.
    const write = async (asUpdate: boolean) =>
      asUpdate
        ? await supabase
            .from("coach_payment_gateways")
            .update(payload satisfies TablesUpdate<"coach_payment_gateways">)
            .eq("coach_id", coachId)
            .eq("provider", provider)
        : await supabase.from("coach_payment_gateways").insert(payload);

    let { error } = await write(!!existing);

    // The row can exist without this component knowing — another tab, or an
    // admin editing the same coach. 23505 is the unique (coach_id, provider)
    // violation, and the right answer is simply to update instead.
    if (error?.code === "23505") ({ error } = await write(true));

    setSaving(null);

    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }

    setDrafts((d) => ({ ...d, [provider]: {} }));
    toast({ title: `${spec.name} saved` });
    load();
  };

  type GatewaySettings = Pick<GatewayRow, "environment" | "currency" | "is_enabled" | "is_default">;

  const patch = async (provider: PaymentProvider, changes: Partial<GatewaySettings>) => {
    if (!rows[provider]) return;

    // Only one gateway may be the default, so clear the others first or the
    // partial unique index rejects the update.
    if (changes.is_default) {
      await supabase
        .from("coach_payment_gateways")
        .update({ is_default: false })
        .eq("coach_id", coachId)
        .neq("provider", provider);
    }

    const { error } = await supabase
      .from("coach_payment_gateways")
      .update({ ...changes, updated_at: new Date().toISOString() } satisfies TablesUpdate<"coach_payment_gateways">)
      .eq("coach_id", coachId)
      .eq("provider", provider);

    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const disconnect = async (provider: PaymentProvider) => {
    const { error } = await supabase
      .from("coach_payment_gateways")
      .delete()
      .eq("coach_id", coachId)
      .eq("provider", provider);

    if (error) {
      toast({ title: "Couldn't disconnect", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${PAYMENT_PROVIDERS[provider].name} disconnected` });
    load();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {PROVIDER_IDS.map((provider) => {
        const spec = PAYMENT_PROVIDERS[provider];
        const row = rows[provider];
        const connected = !!row && isGatewayReady(row);

        return (
          <Card key={provider} className={cn(connected && "border-success/40")}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <CardTitle className="text-sm">{spec.name}</CardTitle>
                  {connected ? (
                    <Badge className="bg-success text-success-foreground gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Not connected
                    </Badge>
                  )}
                  {connected && row.is_default && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Star className="h-3 w-3" /> Default
                    </Badge>
                  )}
                  {row?.environment === "test" && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                      Test mode
                    </Badge>
                  )}
                </div>

                {connected && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enabled-${provider}`} className="text-xs text-muted-foreground">
                      Enabled
                    </Label>
                    <Switch
                      id={`enabled-${provider}`}
                      checked={row.is_enabled}
                      onCheckedChange={(v) => patch(provider, { is_enabled: v })}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{spec.blurb}</p>
            </CardHeader>

            <CardContent className="space-y-3">
              <a
                href={spec.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Where do I find these? <ExternalLink className="h-3 w-3" />
              </a>

              {spec.fields.map((field) => {
                const inputId = `${provider}-${field.column}`;
                const stored =
                  field.column === "key_id"
                    ? !!row?.key_id
                    : field.column === "key_secret"
                      ? !!row?.has_secret
                      : field.column === "salt"
                        ? !!row?.has_salt
                        : !!row?.has_webhook_secret;

                // Only the key id is ever readable back.
                const plainValue = field.column === "key_id" ? (row?.key_id ?? "") : "";

                return (
                  <div key={field.column}>
                    <Label htmlFor={inputId} className="text-xs">
                      {field.label}
                      {!field.required && <span className="text-muted-foreground"> (optional)</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id={inputId}
                        type={field.secret && !revealed[inputId] ? "password" : "text"}
                        className="font-mono text-xs pr-10"
                        placeholder={
                          field.secret && stored
                            ? "Saved - leave blank to keep"
                            : field.placeholder
                        }
                        value={
                          field.secret
                            ? draftFor(provider, field.column)
                            : draftFor(provider, field.column) || plainValue
                        }
                        onChange={(e) => setDraft(provider, field.column, e.target.value)}
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [inputId]: !r[inputId] }))}
                          aria-label={revealed[inputId] ? "Hide value" : "Show value"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {revealed[inputId] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {field.help && (
                      <p className="text-[11px] text-muted-foreground mt-1">{field.help}</p>
                    )}
                  </div>
                );
              })}

              {connected && (
                <div
                  className={cn(
                    "rounded-lg border p-3 space-y-2",
                    hasWebhookSigning(row) ? "border-border" : "border-amber-500/50 bg-amber-50/50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {hasWebhookSigning(row) ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {hasWebhookSigning(row)
                          ? "Webhook signing is set up"
                          : "Webhook signing is not set up yet"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {hasWebhookSigning(row)
                          ? spec.webhookEvents
                            ? `Make sure this URL is registered in your ${spec.name} dashboard.`
                            : `Nothing further to do — ${spec.name} is told the URL with every payment.`
                          : "Until this is done, a buyer who closes the tab straight after paying will not get access automatically."}
                      </p>
                    </div>
                  </div>

                  {/* Instamojo is handed the URL on every payment request, so
                      showing it would only invite a pointless dashboard trip. */}
                  {spec.webhookEvents && (
                    <>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 min-w-0 truncate rounded bg-muted px-2 py-1.5 text-[11px] font-mono">
                          {WEBHOOK_URL}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(WEBHOOK_URL);
                            toast({ title: "Webhook URL copied" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Enable exactly these events:
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {spec.webhookEvents.map((event) => (
                            <code
                              key={event}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono"
                            >
                              {event}
                            </code>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select
                    value={row?.currency ?? spec.currencies[0]}
                    onValueChange={(v) => (row ? patch(provider, { currency: v }) : undefined)}
                    disabled={!row}
                  >
                    <SelectTrigger className="h-9 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {spec.currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {spec.supportsTestMode && (
                  <div>
                    <Label className="text-xs">Mode</Label>
                    <Select
                      value={row?.environment ?? "live"}
                      onValueChange={(v) =>
                        row ? patch(provider, { environment: v as "live" | "test" }) : undefined
                      }
                      disabled={!row}
                    >
                      <SelectTrigger className="h-9 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={saving === provider}
                  onClick={() => save(provider)}
                >
                  {saving === provider && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {connected ? "Update keys" : `Connect ${spec.name}`}
                </Button>

                {connected && !row.is_default && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patch(provider, { is_default: true })}
                  >
                    Make default
                  </Button>
                )}

                {row && (
                  <Button size="sm" variant="outline" onClick={() => disconnect(provider)}>
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default PaymentGatewaysCard;
