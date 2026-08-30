import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { TablesInsert } from "@/integrations/supabase/types";

export type EmailPurpose = "transactional" | "marketing" | "automation" | "support";

export const EMAIL_PURPOSES: { id: EmailPurpose; label: string; help: string }[] = [
  {
    id: "transactional",
    label: "Transactional",
    help: "Login codes, receipts and account notices",
  },
  { id: "marketing", label: "Marketing", help: "Broadcasts and campaigns" },
  { id: "automation", label: "Automation", help: "Journey and sequence emails" },
  { id: "support", label: "Support", help: "Replies and help desk messages" },
];

interface AccountOption {
  id: string;
  sender_name: string;
  sender_email: string;
  provider: string;
  is_verified: boolean;
}

/**
 * Chooses which sender account each kind of email goes out from.
 *
 * A coach could already store several sender accounts, but only one flag
 * (is_default) decided which one sent everything — there was no way to send
 * marketing from hello@ and receipts from billing@.
 */
export function EmailRoutingCard({ coachId }: { coachId: string }) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [routing, setRouting] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<EmailPurpose | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accs }, { data: rows }] = await Promise.all([
      supabase
        .from("email_accounts")
        .select("id, sender_name, sender_email, provider, is_verified")
        .eq("coach_id", coachId),
      supabase
        .from("email_account_assignments")
        .select("purpose, account_id")
        .eq("coach_id", coachId),
    ]);

    setAccounts(((accs || []) as unknown as AccountOption[]) ?? []);

    const map: Record<string, string> = {};
    for (const r of (rows || []) as unknown as { purpose: string; account_id: string }[]) {
      map[r.purpose] = r.account_id;
    }
    setRouting(map);
    setLoading(false);
  }, [coachId]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  const assign = async (purpose: EmailPurpose, accountId: string) => {
    setSaving(purpose);

    // "default" means "no explicit route" — the send path then falls back to
    // the coach's default account.
    if (accountId === "default") {
      const { error } = await supabase
        .from("email_account_assignments")
        .delete()
        .eq("coach_id", coachId)
        .eq("purpose", purpose);

      setSaving(null);
      if (error) {
        toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
        return;
      }
      setRouting((r) => {
        const next = { ...r };
        delete next[purpose];
        return next;
      });
      toast({ title: `${purpose} uses your default sender` });
      return;
    }

    const { error } = await supabase.from("email_account_assignments").upsert(
      {
        coach_id: coachId,
        purpose,
        account_id: accountId,
        updated_at: new Date().toISOString(),
      } satisfies TablesInsert<"email_account_assignments">,
      { onConflict: "coach_id,purpose" },
    );

    setSaving(null);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    setRouting((r) => ({ ...r, [purpose]: accountId }));
    toast({ title: "Routing updated" });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Route className="h-4 w-4 text-accent" /> Which account sends what
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pick a sender per kind of email. Anything left on Default uses your default account.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add a sender account first — there is nothing to route to yet.
          </p>
        ) : (
          EMAIL_PURPOSES.map((purpose) => (
            <div key={purpose.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Label className="text-sm">{purpose.label}</Label>
                <p className="text-[11px] text-muted-foreground">{purpose.help}</p>
              </div>
              <Select
                value={routing[purpose.id] ?? "default"}
                onValueChange={(v) => assign(purpose.id, v)}
                disabled={saving === purpose.id}
              >
                <SelectTrigger className="w-[260px] max-w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default sender</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.sender_name} &lt;{a.sender_email}&gt;
                      {a.is_verified ? "" : " (unverified)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default EmailRoutingCard;
