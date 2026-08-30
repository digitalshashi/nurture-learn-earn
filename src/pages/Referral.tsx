/**
 * /referral — Refer & Earn.
 *
 * This page used to be a mock: three invented names, a hardcoded total and a
 * link pointing at "platform.com". Every number here now comes from the
 * database, and the page subscribes to its own rows, so a click from a friend
 * on the other side of the country moves the counter while the member is
 * still looking at it.
 *
 * The funnel is shown as a funnel — clicks, signups, buyers — because those
 * three numbers together are what tells a member whether the problem is that
 * nobody is clicking or that nobody is converting. A single "12 referrals"
 * says neither.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShareDialog } from "@/components/share/ShareDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { referralUrl } from "@/lib/referral";
import { BRAND } from "@/lib/brand";
import { shareTarget, type ShareSubject } from "@/lib/share";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Gift,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Save,
  Share2,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";

interface Stats {
  visits: number;
  signups: number;
  buyers: number;
  revenue: number;
  reward_pending: number;
  reward_approved: number;
  reward_paid: number;
}

interface ReferralRow {
  id: string;
  display_name: string;
  signed_up_at: string;
  first_purchase_at: string | null;
  purchase_count: number;
  revenue: number;
  reward_amount: number;
  reward_status: string;
}

interface Program {
  is_active: boolean;
  signup_reward: number;
  purchase_percent: number;
  currency: string;
  attribution_days: number;
  terms: string | null;
}

const EMPTY_STATS: Stats = {
  visits: 0,
  signups: 0,
  buyers: 0,
  revenue: 0,
  reward_pending: 0,
  reward_approved: 0,
  reward_paid: 0,
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Referral() {
  const { user, hasRole } = useAuth();
  const { format } = useCurrency();
  const { toast } = useToast();

  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [live, setLive] = useState(false);

  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const link = code ? referralUrl(window.location.origin, code) : "";

  const loadProgram = useCallback(async () => {
    const { data } = await supabase
      .from("referral_program")
      .select("is_active, signup_reward, purchase_percent, currency, attribution_days, terms")
      .maybeSingle();
    setProgram(data as Program | null);
  }, []);

  /** Stats and history together — they are always shown together. */
  const loadNumbers = useCallback(async () => {
    const [{ data: statRows }, { data: history }] = await Promise.all([
      supabase.rpc("my_referral_stats"),
      supabase.rpc("my_referrals"),
    ]);
    if (statRows && statRows.length > 0) setStats(statRows[0] as Stats);
    setRows((history || []) as ReferralRow[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      // The code is minted on first visit, so a member never has to "create"
      // anything before they can share.
      const [{ data: mine, error }] = await Promise.all([
        supabase.rpc("my_referral_code"),
        loadProgram(),
      ]);
      if (cancelled) return;
      if (error) {
        toast({
          title: "Could not load your referral link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setCode(mine as string | null);
      }
      await loadNumbers();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loadProgram, loadNumbers, toast]);

  // Coalesce bursts: a signup that immediately buys fires two events, and a
  // single refetch answers both.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => void loadNumbers(), 400);
  }, [loadNumbers]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`referral:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
          filter: `referrer_id=eq.${user.id}`,
        },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "referral_visits",
          filter: `referrer_id=eq.${user.id}`,
        },
        scheduleRefetch,
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [user, scheduleRefetch]);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy", description: link, variant: "destructive" });
    }
  };

  // `text` is the field ShareSubject reads for the line above the link; a
  // `description` key here would be silently ignored and the message would go
  // out as a bare title.
  const shareSubject = useMemo<ShareSubject>(
    () => ({
      title: `Join me on ${BRAND.name}`,
      text: program?.is_active
        ? "Use my invite link to get started."
        : `Learn with me on ${BRAND.name}.`,
      url: link,
    }),
    [link, program?.is_active],
  );

  const openWhatsApp = () => {
    if (!link) return;
    const target = shareTarget("whatsapp", shareSubject);
    window.open(target.href, "_blank", "noopener,noreferrer");
  };

  const earned = stats.reward_pending + stats.reward_approved + stats.reward_paid;
  const conversion = stats.visits > 0 ? Math.round((stats.signups / stats.visits) * 100) : 0;

  const funnel = [
    {
      key: "visits",
      label: "Link clicks",
      value: stats.visits,
      icon: MousePointerClick,
      hint: "People who opened your link",
    },
    {
      key: "signups",
      label: "Signups",
      value: stats.signups,
      icon: UserPlus,
      hint: stats.visits > 0 ? `${conversion}% of clicks` : "Attributed to your link",
    },
    {
      key: "buyers",
      label: "Buyers",
      value: stats.buyers,
      icon: ShoppingBag,
      hint: stats.signups > 0 ? `${Math.round((stats.buyers / stats.signups) * 100)}% of signups` : "Made a purchase",
    },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold">Refer &amp; Earn</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {program?.is_active
                ? "Share your link. Everything it brings in is tracked here."
                : "The referral programme is paused right now."}
              {live && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Share — the point of the page, so it leads. */}
        <Card className="card-shadow mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-accent/10 to-transparent p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-accent/15 p-2.5">
                <Gift className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold">Share with your friends</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {program?.is_active ? (
                    <>
                      {program.signup_reward > 0 && (
                        <>You get {format(program.signup_reward)} when someone joins</>
                      )}
                      {program.signup_reward > 0 && program.purchase_percent > 0 && ", plus "}
                      {program.purchase_percent > 0 && (
                        <>
                          {program.purchase_percent}% of everything they buy
                        </>
                      )}
                      {program.signup_reward === 0 && program.purchase_percent === 0 && (
                        <>Invite friends to join you here.</>
                      )}
                      {(program.signup_reward > 0 || program.purchase_percent > 0) && "."}
                    </>
                  ) : (
                    <>Your link still works — rewards resume when the programme does.</>
                  )}
                </p>
              </div>
            </div>

            {link ? (
              <>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={link}
                    readOnly
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 bg-background font-mono text-sm"
                    aria-label="Your referral link"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={copyLink} className="shrink-0">
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-4 w-4" /> Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={openWhatsApp}
                      className="shrink-0 text-[#25D366]"
                      aria-label="Share on WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setShareOpen(true)} className="shrink-0">
                      <Share2 className="mr-1.5 h-4 w-4" /> Share
                    </Button>
                  </div>
                </div>

                {program && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    A click counts for {program.attribution_days} days, so a friend who signs up next
                    week still counts as yours.
                  </p>
                )}
              </>
            ) : (
              // Showing an empty box with a Copy button next to it would be
              // worse than saying plainly that there is nothing to copy.
              <div className="mt-4 rounded-lg border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Your invite link is not available yet. Refresh in a moment — if it stays empty, the
                referral programme has not been set up on this workspace.
              </div>
            )}
          </div>
        </Card>

        {/* The funnel */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {funnel.map((step) => (
            <Card key={step.key} className="card-shadow">
              <CardContent className="flex items-center gap-3 pb-3 pt-4">
                <div className="rounded-lg bg-secondary p-2">
                  <step.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{step.label}</p>
                  <p className="text-xl font-bold tabular-nums">{step.value}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{step.hint}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Earnings, split by what has actually been settled. */}
        <Card className="card-shadow mb-6">
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total earned</p>
              <p className="text-xl font-bold tabular-nums">{format(earned)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {format(stats.reward_pending)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xl font-bold tabular-nums">{format(stats.reward_approved)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid out</p>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {format(stats.reward_paid)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              People you referred{rows.length > 0 && ` (${rows.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-medium">Nobody has joined through your link yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  {stats.visits > 0
                    ? `${stats.visits} ${stats.visits === 1 ? "person has" : "people have"} opened your link. As soon as one signs up, they appear here.`
                    : "Share your link above and this fills in on its own."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Purchases</TableHead>
                      <TableHead className="text-right">They spent</TableHead>
                      <TableHead className="text-right">You earned</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm font-medium">{row.display_name}</TableCell>
                        <TableCell className="text-sm">{formatDate(row.signed_up_at)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.purchase_count}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {format(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {format(row.reward_amount)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              row.reward_status === "paid" &&
                                "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                              row.reward_status === "approved" && "bg-info/15 text-info",
                              row.reward_status === "pending" &&
                                "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {row.reward_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && program && (
          <ProgramSettings program={program} onSaved={loadProgram} />
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={link}
        title={shareSubject.title}
        description={shareSubject.text}
        heading="Share your invite link"
      />
    </AppLayout>
  );
}

/**
 * The incentive itself, editable by staff.
 *
 * It lives on this page rather than in Settings because the number being set
 * is the number every member reads two cards further up — editing it anywhere
 * else makes it easy to change the offer without seeing how it now reads.
 */
function ProgramSettings({ program, onSaved }: { program: Program; onSaved: () => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(program);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(program), [program]);

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("referral_program")
        .update({
          is_active: draft.is_active,
          signup_reward: Number(draft.signup_reward) || 0,
          purchase_percent: Number(draft.purchase_percent) || 0,
          attribution_days: Number(draft.attribution_days) || 30,
          terms: draft.terms?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nothing was written — this needs an admin account.");
      }
      toast({ title: "Referral terms updated", description: "Members see the new offer straight away." });
      onSaved();
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="card-shadow mt-6 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Programme settings</CardTitle>
        <p className="text-xs text-muted-foreground">
          Admins only. This is the offer every member sees on this page.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Programme active</p>
            <p className="text-xs text-muted-foreground">
              Turning this off stops new rewards accruing. Existing links keep working.
            </p>
          </div>
          <Switch
            checked={draft.is_active}
            onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Reward per signup</Label>
            <Input
              type="number"
              min={0}
              value={draft.signup_reward}
              onChange={(e) => setDraft({ ...draft, signup_reward: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Share of purchases (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.purchase_percent}
              onChange={(e) => setDraft({ ...draft, purchase_percent: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Attribution window (days)</Label>
            <Input
              type="number"
              min={1}
              value={draft.attribution_days}
              onChange={(e) => setDraft({ ...draft, attribution_days: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Terms shown to members and invitees</Label>
          <Textarea
            value={draft.terms || ""}
            onChange={(e) => setDraft({ ...draft, terms: e.target.value })}
            placeholder="e.g. Rewards are approved once the referred member's first payment clears."
            className="mt-1 min-h-[70px] text-sm"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save terms
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
