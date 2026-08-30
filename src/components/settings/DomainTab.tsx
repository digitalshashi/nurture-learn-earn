import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AttachedPageCard } from "@/components/pages/AttachedPageCard";
import {
  Loader2,
  Globe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  ShieldCheck,
} from "lucide-react";

/** The DNS record set a registrar needs, derived from the saved row. */
interface DomainRow {
  domain: string;
  status: string;
  verification_token: string;
  cname_target: string;
  is_live: boolean;
  last_error: string | null;
  verified_at: string | null;
  ssl_status: string | null;
  ssl_error: string | null;
}

const VERIFY_PREFIX = "_1corehub-verify";

const EMPTY: DomainRow = {
  domain: "",
  status: "pending",
  verification_token: "",
  cname_target: "",
  is_live: false,
  last_error: null,
  verified_at: null,
  ssl_status: null,
  ssl_error: null,
};

/** One DNS record, laid out the way a registrar's form asks for it. */
function DnsRecord({
  type,
  name,
  value,
}: {
  type: string;
  name: string;
  value: string;
}) {
  const { toast } = useToast();
  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-[80px_1fr] text-xs">
        <span className="text-muted-foreground">Type</span>
        <span className="font-mono">{type}</span>

        <span className="text-muted-foreground">Name</span>
        <button
          type="button"
          onClick={() => copy("Name", name)}
          className="font-mono text-left break-all hover:text-accent inline-flex items-start gap-1.5"
        >
          {name} <Copy className="h-3 w-3 mt-0.5 shrink-0" />
        </button>

        <span className="text-muted-foreground">Value</span>
        <button
          type="button"
          onClick={() => copy("Value", value)}
          className="font-mono text-left break-all hover:text-accent inline-flex items-start gap-1.5"
        >
          {value} <Copy className="h-3 w-3 mt-0.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}

export function DomainTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [row, setRow] = useState<DomainRow>(EMPTY);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Keyed on the id, not the user object: useAuth hands back a fresh object
  // every render, so depending on it refetches in a loop.
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("domain_settings")
      .select(
        "domain, status, verification_token, cname_target, is_live, last_error, verified_at, ssl_status, ssl_error",
      )
      .eq("coach_id", userId)
      .maybeSingle();

    if (data) {
      const d = data as unknown as DomainRow;
      setRow({ ...EMPTY, ...d });
      setDraft(d.domain ?? "");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!userId || !draft.trim()) return;
    setSaving(true);
    // Changing the hostname invalidates any previous verification.
    const { error } = await supabase.from("domain_settings").upsert(
      {
        coach_id: userId,
        domain: draft.trim().toLowerCase(),
        status: "pending",
        verified_at: null,
        is_live: false,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "coach_id" },
    );
    setSaving(false);

    if (error) {
      toast({
        title: "Couldn't save",
        // A second tenant claiming the same hostname trips the unique index.
        description: /duplicate|unique/i.test(error.message)
          ? "That domain is already connected to another account."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Domain saved", description: "Now add the two DNS records below." });
    load();
  };

  const verify = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-domain", {});
      if (error) throw error;
      toast({
        title: data?.verified ? "Domain verified" : "Not verified yet",
        description: data?.message,
        variant: data?.verified ? "default" : "destructive",
      });
    } catch (e) {
      toast({
        title: "Couldn't check DNS",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
    setVerifying(false);
    load();
  };

  const setLive = async (live: boolean) => {
    if (!userId) return;
    const { error } = await supabase
      .from("domain_settings")
      .update({ is_live: live, updated_at: new Date().toISOString() } as never)
      .eq("coach_id", userId);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    setRow((r) => ({ ...r, is_live: live }));
  };

  const verified = row.status === "verified";

  const statusBadge = () => {
    if (verified) {
      return (
        <Badge className="bg-green-100 text-green-700 border-0">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
        </Badge>
      );
    }
    if (row.domain) {
      return (
        <Badge variant="secondary" className="border-0">
          <Clock className="h-3 w-3 mr-1" /> Awaiting DNS
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Your own domain</h3>
            <p className="text-xs text-muted-foreground">
              Run your academy on your own address. Once it is verified and live, only you, your
              team and your own students can sign in there.
            </p>
          </div>

          {row.domain && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{row.domain}</span>
              {statusBadge()}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">Domain</Label>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="learn.yourdomain.com"
                className="font-mono text-xs"
              />
            </div>
            <Button
              onClick={save}
              disabled={saving || !draft.trim() || draft.trim().toLowerCase() === row.domain}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : row.domain ? "Change" : "Add"}
            </Button>
          </div>

          {row.domain && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium">
                  Add these two records at your DNS provider
                </p>
                <p className="text-[10px] text-muted-foreground">
                  The TXT record proves the domain is yours. The CNAME points it at us. Click any
                  value to copy it.
                </p>

                <DnsRecord
                  type="TXT"
                  name={`${VERIFY_PREFIX}.${row.domain}`}
                  value={row.verification_token}
                />
                <DnsRecord type="CNAME" name={row.domain} value={row.cname_target} />
              </div>

              {row.last_error && !verified && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{row.last_error}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={verify} disabled={verifying}>
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                  )}
                  Check DNS now
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  DNS changes can take up to an hour to spread.
                </span>
              </div>
            </>
          )}

          {verified && (
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="flex items-center gap-2">
                {row.ssl_status === "active" ? (
                  <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <p className="text-xs font-medium">HTTPS certificate</p>
              </div>
              {/* Verified DNS and a working certificate are different things:
                  until the edge issues one, the browser refuses the connection
                  before any of our code runs. */}
              <p className="text-[10px] text-muted-foreground">
                {row.ssl_error
                  ? row.ssl_error
                  : row.ssl_status === "active"
                    ? "Issued. The domain is serving over HTTPS."
                    : row.ssl_status
                      ? "Being issued. This usually takes a few minutes — check again shortly."
                      : "Not provisioned yet. Run a DNS check to start it."}
              </p>
            </div>
          )}
          {verified && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
              <div>
                <p className="text-xs font-medium">Serve the academy on this domain</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  While this is off, the domain resolves but sign-in still happens on the main
                  platform address.
                </p>
              </div>
              <Switch checked={row.is_live} onCheckedChange={setLive} aria-label="Go live" />
            </div>
          )}
        </CardContent>
      </Card>

      {verified && (
        <AttachedPageCard
          pageType="landing"
          attachment={user ? { kind: "tenant_home", ownerId: user.id } : null}
          ownerName={row.domain}
          context={{ domain: row.domain }}
          emptyHint="Sign in again to design this page."
          defaultLabel="sign-in page"
        />
      )}
    </div>
  );
}
